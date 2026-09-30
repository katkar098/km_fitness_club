const memberService =
  require("../services/member.service");

const db =
  require("../config/db");

// ============================================================
// GET ALL MEMBERS
// ============================================================

async function getAllMembers(req, res) {
  try {
    const members =
      await memberService.getAllMembers();

    return res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (err) {
    console.error("getAllMembers error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// SEARCH MEMBERS
// ============================================================

async function searchMembers(req, res) {
  try {
    const search = req.query.q || req.query.search || "";

    const members = await memberService.searchMembers(search);

    return res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (err) {
    console.error("searchMembers error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// GET MEMBER
// ============================================================

async function getMemberById(req, res) {
  try {
    const member = await memberService.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.json({
      success: true,
      data: member,
    });
  } catch (err) {
    console.error("getMemberById error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

async function getUnregisteredBiometricUsers(req, res) {
  try {
    const result = await db.query(`
      SELECT biometric_id, name, machine_user_id, member_id, sync_status
      FROM biometric_users
      WHERE sync_status = 'unregistered'
        AND member_id IS NULL
      ORDER BY name ASC NULLS LAST, biometric_id ASC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("getUnregisteredBiometricUsers error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to load unregistered biometric users.",
    });
  }
}

// ============================================================
// CREATE NORMAL MEMBER
// ============================================================

async function createMember(req, res) {
  try {
    const member = await memberService.createMember(req.body);

    return res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });
  } catch (err) {
    console.error("createMember error:", err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// HELPER: turn a raw Postgres error into a specific, honest
// message instead of ever falling back to something generic.
//
// pg exposes these fields on error objects for constraint
// violations and RAISE EXCEPTION alike:
//   err.code       -> '23505' for unique_violation
//   err.detail     -> e.g. "Key (member_code)=(4) already exists."
//   err.constraint -> the constraint/index name
//   err.table      -> the table involved
//   err.message    -> for RAISE EXCEPTION, the exact text raised
//                      (e.g. from a trigger) — plus err.detail /
//                      err.hint if the trigger supplied them via
//                      RAISE EXCEPTION '...' USING DETAIL = '...'
// ============================================================

function describeDbError(err) {
  const parts = [];

  if (err.message) parts.push(err.message);
  if (err.detail) parts.push(err.detail);
  if (err.constraint) parts.push(`(constraint: ${err.constraint})`);
  if (err.table && !err.detail) parts.push(`(table: ${err.table})`);

  const combined = parts.filter(Boolean).join(" ");

  return combined || "A database error occurred.";
}

function duplicateMemberMessage(err) {
  const duplicateText = [err?.constraint, err?.detail, err?.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/biometric|member_code|employee_code/.test(duplicateText)) {
    return "This biometric user is already registered to an existing member.";
  }

  return "A member with this information already exists.";
}

// ============================================================
// ENROLL MEMBER
// ============================================================

async function enrollMember(req, res) {
  const client = await db.getPool().connect();

  try {
    await client.query("BEGIN");

    const body = req.body || {};

    // ========================================================
    // EMPLOYEE CODE
    //
    // BIOMETRIC USER ID IS THE SOURCE OF TRUTH.
    // ========================================================

    const rawBiometricEmployeeCode =
      body.biometricUserId || body.employeeCode || body.memberCode;

    if (!rawBiometricEmployeeCode) {
      throw new Error("Biometric Employee Code is required.");
    }

    // Normalize leading zeros the same way the rest of the app
    // does (e.g. "007", "07", "7" should all be treated as the
    // same code) — this keeps the duplicate check consistent
    // with how biometric IDs are normalized elsewhere.
    const finalMemberCode = String(rawBiometricEmployeeCode)
      .trim()
      .replace(/^0+(\d)/, "$1");

    if (!finalMemberCode) {
      throw new Error("Biometric Employee Code is required.");
    }

    if (!body.biometricUserId || !String(body.biometricUserId).trim()) {
      throw new Error("Select an available biometric user.");
    }

    // Serialize enrollments for the same normalized biometric ID. The
    // unique indexes remain the final safeguard, while this prevents two
    // simultaneous admins from both passing the application-level check.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`member-biometric:${finalMemberCode}`]
    );

    console.log("====================================");
    console.log("BIOMETRIC USER ID:", body.biometricUserId);
    console.log("REQUEST EMPLOYEE CODE:", body.employeeCode);
    console.log("REQUEST MEMBER CODE:", body.memberCode);
    console.log("FINAL EMPLOYEE CODE:", finalMemberCode);
    console.log("====================================");

    // ========================================================
    // MANUAL START / EXPIRY DATE
    // ========================================================

    const startDate = body.startDate;

    if (!startDate) {
      throw new Error("Membership start date is required.");
    }

    const expiryDate = body.expiryDate;

    if (!expiryDate) {
      throw new Error("Membership expiry date is required.");
    }

    const start = new Date(`${startDate}T00:00:00`);
    const expiry = new Date(`${expiryDate}T00:00:00`);

    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid membership start date.");
    }

    if (Number.isNaN(expiry.getTime())) {
      throw new Error("Invalid membership expiry date.");
    }

    if (expiry < start) {
      throw new Error("Membership expiry date cannot be before start date.");
    }

    // ========================================================
    // CHECK EXISTING MEMBER (normalized, with detail)
    //
    // Also normalizes stored values the same way, so "007" in
    // the DB still matches "7" coming from the request — this
    // was the gap that let a real duplicate slip past the old
    // check and hit a raw DB constraint (or trigger) instead,
    // which is why you were seeing a generic error with no
    // useful detail.
    // ========================================================

    const existingMember = await client.query(
      `
      SELECT m.id, m.full_name, m.member_code
      FROM members m
      WHERE regexp_replace(btrim(m.member_code), '^0+(\\d)', '\\1') = $1
        OR EXISTS (
          SELECT 1 FROM biometric_users bu
          WHERE bu.member_id = m.id
            AND regexp_replace(btrim(bu.biometric_id::text), '^0+(\\d)', '\\1') = $1
        )
      LIMIT 1
      `,
      [finalMemberCode]
    );

    if (existingMember.rows.length > 0) {
      const error = new Error(
        "This biometric user is already registered to an existing member."
      );
      error.status = 409;
      throw error;
    }

    // ========================================================
    // CREATE MEMBER
    // ========================================================

    let member;

    try {
      const memberResult = await client.query(
        `
        INSERT INTO members (
          member_code,
          full_name,
          phone,
          gender,
          address,
          status,
          biometric_enabled,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          'active', true,
          NOW(), NOW()
        )
        RETURNING id, member_code, full_name, phone, gender, address,
                  status, biometric_enabled, created_at, updated_at;
        `,
        [
          finalMemberCode,
          body.fullName,
          body.phone || null,
          body.gender || null,
          body.address || null,
        ]
      );

      member = memberResult.rows[0];
    } catch (dbError) {
      // Keep the SQLSTATE so the outer handler can safely translate it.
      throw dbError;
    }

    // Link the selected, already-existing biometric record in this
    // transaction. The conditional update is the concurrency guard: a
    // second enrollment cannot claim a row that has already been linked.
    const biometricResult = await client.query(
      `
      UPDATE biometric_users
      SET member_id = $1, sync_status = 'registered'
      WHERE biometric_id::text = $2
        AND sync_status = 'unregistered'
        AND member_id IS NULL
      RETURNING biometric_id, name, machine_user_id, member_id, sync_status
      `,
      [member.id, String(body.biometricUserId).trim()]
    );

    if (biometricResult.rows.length === 0) {
      const error = new Error(
        "The selected biometric user is no longer available for registration. It may already be registered."
      );
      error.status = 409;
      throw error;
    }
    const biometricUser = biometricResult.rows[0];

    // ========================================================
    // CREATE MEMBERSHIP
    // ========================================================

    let membership = null;

    if (body.planId) {
      const planResult = await client.query(
        `
        SELECT *
        FROM membership_plans
        WHERE id = $1
        LIMIT 1
        `,
        [body.planId]
      );

      if (planResult.rows.length === 0) {
        throw new Error("Membership plan not found.");
      }

      const plan = planResult.rows[0];

      try {
        const membershipResult = await client.query(
          `
          INSERT INTO memberships (
            member_id,
            plan_id,

            start_date,
            end_date,

            status,
            amount,

            created_at,
            updated_at
          )
          VALUES (
            $1, $2,
            $3, $4,
            'active', $5,
            NOW(), NOW()
          )
          RETURNING *;
          `,
          [
            member.id,
            body.planId,
            startDate,
            expiryDate,
            Number(
              body.amount ||
                body.finalAmount ||
                body.baseAmount ||
                plan.price ||
                0
            ),
          ]
        );

        membership = membershipResult.rows[0];
      } catch (dbError) {
        throw dbError;
      }
    }

    // ========================================================
    // PAYMENT
    // ========================================================

    const paymentAmount = Number(body.amount || body.finalAmount || 0);

    if (paymentAmount > 0) {
      try {
        await client.query(
          `
          INSERT INTO payments (
            member_id,
            membership_id,

            amount,
            payment_method,

            paid_at,
            status,

            created_at
          )
          VALUES (
            $1, $2,
            $3, $4,
            NOW(), 'completed',
            NOW()
          )
          `,
          [
            member.id,
            membership ? membership.id : null,
            paymentAmount,
            body.paymentMethod || "cash",
          ]
        );
      } catch (dbError) {
        throw dbError;
      }
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await client.query("COMMIT");

    const finalStartDate = membership?.start_date || startDate;
    const finalExpiryDate = membership?.end_date || expiryDate;

    const returnedMemberCode = String(
      member.biometric_user_id ||
        member.employee_code ||
        member.member_code ||
        finalMemberCode
    ).trim();

    return res.status(201).json({
      success: true,
      message: "Member enrolled successfully",

      data: {
        member,
        membership,
        biometricUser,

        memberCode: returnedMemberCode,
        employeeCode: returnedMemberCode,

        startDate: finalStartDate,
        expiryDate: finalExpiryDate,
        endDate: finalExpiryDate,
        membershipStartDate: finalStartDate,
        membershipExpiryDate: finalExpiryDate,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("enrollMember error:", err);

    // If somehow a bare/generic message still slips through
    // (e.g. a trigger that raises "Duplicate entry found" with
    // no detail at all), at least log the raw error object so
    // you can inspect err.constraint / err.table / err.detail
    // in your server logs even when the JSON response is thin.
    if (err.code === "23505" || err.constraint || err.detail) {
      console.error("DB ERROR DETAIL:", {
        code: err.code,
        detail: err.detail,
        constraint: err.constraint,
        table: err.table,
      });
    }

    const errorText = [err.message, err.detail, err.constraint]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const isDuplicate = err.code === "23505" ||
      /duplicate entry|duplicate key|unique constraint|already exists/.test(errorText);
    const isDatabaseError = Boolean(err.code);
    const message = isDuplicate
      ? duplicateMemberMessage(err)
      : isDatabaseError
        ? "Unable to create the member due to a database error. Please try again."
        : (err.message || "Unable to create the member.");

    return res.status(isDuplicate ? 409 : (err.status || (isDatabaseError ? 500 : 400))).json({
      success: false,
      message,
    });
  } finally {
    client.release();
  }
}

// ============================================================
// UPDATE MEMBER
// ============================================================

async function updateMember(req, res) {
  try {
    const member = await memberService.updateMember(req.params.id, req.body);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.json({
      success: true,
      message: "Member updated successfully",
      data: member,
    });
  } catch (err) {
    console.error("updateMember error:", err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// DELETE MEMBER
// ============================================================

async function deleteMember(req, res) {
  try {
    const member = await memberService.deleteMember(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.json({
      success: true,
      message: "Member deleted successfully",
      data: member,
    });
  } catch (err) {
    console.error("deleteMember error:", err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// MEMBER MEMBERSHIPS
// ============================================================

async function getMemberMemberships(req, res) {
  try {
    const result = await db.query(
      `
      SELECT
        ms.*,
        mp.name AS plan_name,
        mp.duration_months,
        mp.price
      FROM memberships ms
      LEFT JOIN membership_plans mp
        ON mp.id = ms.plan_id
      WHERE ms.member_id = $1
      ORDER BY ms.start_date DESC
      `,
      [req.params.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("getMemberMemberships error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// MEMBER PAYMENTS
// ============================================================

async function getMemberPayments(req, res) {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM payments
      WHERE member_id = $1
      ORDER BY paid_at DESC,
               created_at DESC
      `,
      [req.params.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("getMemberPayments error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// PHOTO
// ============================================================

async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Photo is required.",
      });
    }

    const result = await db.query(
      `
      UPDATE members
      SET
        photo_url = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [req.file.path || req.file.filename, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    return res.json({
      success: true,
      message: "Photo uploaded successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("uploadPhoto error:", err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getAllMembers,
  searchMembers,
  getMemberById,
  getUnregisteredBiometricUsers,
  createMember,
  enrollMember,
  updateMember,
  deleteMember,
  getMemberMemberships,
  getMemberPayments,
  uploadPhoto,
};
