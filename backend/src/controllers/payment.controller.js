const crypto = require("crypto");

const { query, transaction } = require("../config/db");
const {
  generateReceiptPdf,
  receiptDownloadUrl,
} = require("../services/receiptPdf.service");

// ============================================================
// HELPERS
// ============================================================

const fail = (status, message) =>
  Object.assign(new Error(message), { statusCode: status });

const receiptNumber = () =>
  `KM-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const audit = (db, userId, action, entityType, entityId, metadata = {}) =>
  db.query(
    `
      INSERT INTO audit_logs(admin_id, action, entity_type, entity_id, metadata)
      VALUES($1, $2, $3, $4, $5)
    `,
    [userId, action, entityType, entityId, metadata]
  );

// Same relaxed join as admin.routes.js GET /payments: a payment
// with no member_id (an unlinked Other Income row) must still come
// back, so members/receipts are LEFT JOINed, never INNER JOINed.
const PAYMENT_SELECT = `
  SELECT
    pay.*,
    m.full_name,
    m.member_code,
    m.biometric_user_id,
    r.receipt_number,
    r.receipt_type AS receipt_receipt_type,
    r.pdf_path
  FROM payments pay
  LEFT JOIN members m ON m.id = pay.member_id
  LEFT JOIN receipts r ON r.payment_id = pay.id
`;

// ============================================================
// GET /payments
// ============================================================

exports.getAllPayments = async (req, res, next) => {
  try {
    const { rows } = await query(`
      ${PAYMENT_SELECT}
      ORDER BY pay.paid_at DESC
      LIMIT 200
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /payments/:id
// ============================================================

exports.getPaymentById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `${PAYMENT_SELECT} WHERE pay.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      throw fail(404, "Payment not found");
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /payments/member/:memberId
// ============================================================

exports.getMemberPayments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `${PAYMENT_SELECT} WHERE pay.member_id = $1 ORDER BY pay.paid_at DESC`,
      [req.params.memberId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /payments/receipt/:receiptNumber
// ============================================================

exports.getPaymentByReceipt = async (req, res, next) => {
  try {
    const { rows } = await query(
      `${PAYMENT_SELECT} WHERE r.receipt_number = $1`,
      [req.params.receiptNumber]
    );

    if (!rows[0]) {
      throw fail(404, "Payment not found for that receipt");
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /payments
//
// Used by Billing's "Add Income" (Other Income) form, and
// available generically for any manual payment entry. New
// memberships and renewals still go through the dedicated
// /members/enroll and /members/:id/renew endpoints, which handle
// the membership row transactionally — this endpoint intentionally
// does NOT touch the memberships table.
// ============================================================

exports.createPayment = async (req, res, next) => {
  try {
    const {
      memberId,
      membershipId,
      amount,
      paymentMethod,
      paymentStatus,
      receiptType,
      transactionId,
      description,
      name,
    } = req.body;

    const resolvedReceiptType = receiptType || "other_income";
    const paymentName = name?.trim() || null;
    const paymentDescription = description?.trim() || "";
    // Keep these fields separate without requiring a new payments column on
    // existing installations. The frontend decodes this marker for display.
    const notes = resolvedReceiptType === "other_income"
      ? `KM_BILLING_INCOME_V1:${JSON.stringify({ name: paymentName, description: paymentDescription })}`
      : paymentDescription || null;
    // A short, persisted ledger reference for income without a linked member.
    const resolvedTransactionId = transactionId ||
      (resolvedReceiptType === "other_income" && !memberId
        ? `KM${crypto.randomBytes(3).toString("hex").toUpperCase()}`
        : null);

    const data = await transaction(async (db) => {
      const paymentResult = await db.query(
        `
          INSERT INTO payments(
            member_id,
            membership_id,
            receipt_type,
            amount,
            payment_method,
            transaction_reference,
            notes,
            status
          )
          VALUES($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          memberId || null,
          membershipId || null,
          resolvedReceiptType,
          Number(amount),
          paymentMethod,
          resolvedTransactionId,
          notes,
          paymentStatus || "completed",
        ]
      );

      const payment = paymentResult.rows[0];

      const receiptResult = await db.query(
        `
          INSERT INTO receipts(payment_id, receipt_number, receipt_type)
          VALUES($1, $2, $3)
          RETURNING *
        `,
        [payment.id, receiptNumber(), resolvedReceiptType]
      );

      const receipt = receiptResult.rows[0];

      await audit(
        db,
        req.user.id,
        "payment.created",
        "payment",
        payment.id,
        { memberId: memberId || null, receiptType: resolvedReceiptType, amount }
      );

      return { payment, receipt };
    });

    // Re-fetch through the same select used elsewhere so the
    // response shape (full_name / member_code / receipt fields)
    // matches what GET /payments returns and what the frontend's
    // normalizeTransaction() already expects.
    const { rows } = await query(
      `${PAYMENT_SELECT} WHERE pay.id = $1`,
      [data.payment.id]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PUT /payments/:id
//
// Used by Billing's "Mark Paid" action.
// ============================================================

exports.updatePayment = async (req, res, next) => {
  try {
    const { paymentStatus, transactionId } = req.body;

    const { rows } = await query(
      `
        UPDATE payments
        SET
          status = COALESCE($2, status),
          transaction_reference = COALESCE($3, transaction_reference),
          paid_at = CASE
            WHEN $2 = 'completed' AND status <> 'completed' THEN now()
            ELSE paid_at
          END
        WHERE id = $1
        RETURNING *
      `,
      [req.params.id, paymentStatus || null, transactionId || null]
    );

    if (!rows[0]) {
      throw fail(404, "Payment not found");
    }

    await audit(
      { query },
      req.user.id,
      "payment.updated",
      "payment",
      req.params.id,
      { paymentStatus }
    );

    const refetched = await query(
      `${PAYMENT_SELECT} WHERE pay.id = $1`,
      [req.params.id]
    );

    res.json({ success: true, data: refetched.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE /payments/:id
// ============================================================

exports.deletePayment = async (req, res, next) => {
  try {
    const data = await transaction(async (db) => {
      const paymentResult = await db.query(
        `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
        [req.params.id]
      );

      if (!paymentResult.rows[0]) {
        throw fail(404, "Payment not found");
      }

      await db.query(`DELETE FROM receipts WHERE payment_id = $1`, [req.params.id]);
      await db.query(`DELETE FROM payments WHERE id = $1`, [req.params.id]);

      await audit(db, req.user.id, "payment.deleted", "payment", req.params.id);

      return { id: req.params.id };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /payments/:id/receipt
// ============================================================

exports.generateReceipt = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT receipt_number FROM receipts WHERE payment_id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      throw fail(404, "No receipt found for this payment");
    }

    const path = await generateReceiptPdf(rows[0].receipt_number);

    res.json({ success: true, data: { path } });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /payments/:id/receipt/download
// ============================================================

exports.downloadReceipt = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT receipt_number FROM receipts WHERE payment_id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      throw fail(404, "No receipt found for this payment");
    }

    const url = await receiptDownloadUrl(rows[0].receipt_number);

    res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
};
