const { query, transaction } = require("../config/db");

// ============================================================
// HELPERS
// ============================================================

const fail = (status, message) =>
  Object.assign(new Error(message), { statusCode: status });

const PAYMENT_SELECT = `
  SELECT
    pay.*,
    m.full_name,
    m.member_code,
    m.biometric_user_id
  FROM payments pay
  LEFT JOIN members m ON m.id = pay.member_id
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
    // Preserve a supplied external payment reference (such as a UPI
    // reference), but do not invent an internal receipt-like identifier.
    const resolvedTransactionId = transactionId || null;

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

      return { payment };
    });

    // Re-fetch through the same select used elsewhere so the
    // response shape (full_name / member_code)
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

      await db.query(`DELETE FROM payments WHERE id = $1`, [req.params.id]);

      return { id: req.params.id };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ============================================================
