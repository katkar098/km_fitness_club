const db = require("../config/db");

// ============================================================
// GET ALL MEMBERS
// ============================================================

async function getAllMembers() {
  const result = await db.query(`
    WITH latest_membership AS (
      SELECT DISTINCT ON (member_id)
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        amount,
        created_at,
        updated_at
      FROM memberships
      ORDER BY
        member_id,
        updated_at DESC,
        created_at DESC,
        end_date DESC NULLS LAST
    )

    SELECT
      m.id, m.member_code, m.full_name, m.phone, m.gender, m.address,
      m.status, m.biometric_enabled, m.created_at, m.updated_at,

      lm.id AS membership_id,

      lm.plan_id,

      lm.start_date,
      lm.end_date,

      lm.status AS membership_status,

      lm.amount AS membership_amount,

      mp.name AS plan_name,
      mp.duration_months,
      mp.price AS plan_price

    FROM members m

    LEFT JOIN latest_membership lm
      ON lm.member_id = m.id

    LEFT JOIN membership_plans mp
      ON mp.id = lm.plan_id

    ORDER BY
      m.created_at DESC
  `);

  return result.rows.map((member) => {
    return {
      ...member,

      // IMPORTANT
      // These aliases make old frontend code work too.

      expiry_date:
        member.end_date || null,

      join_date:
        member.start_date || null,

      membership_start_date:
        member.start_date || null,

      membership_end_date:
        member.end_date || null,

      membership_expiry_date:
        member.end_date || null,

      plan:
        member.plan_name || null,

      membership_plan:
        member.plan_name || null,
    };
  });
}

// ============================================================
// SEARCH MEMBERS
// ============================================================

async function searchMembers(search) {
  const searchValue =
    `%${String(search || "").trim()}%`;

  const result = await db.query(
    `
    WITH latest_membership AS (
      SELECT DISTINCT ON (member_id)
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        amount,
        created_at,
        updated_at
      FROM memberships
      ORDER BY
        member_id,
        updated_at DESC,
        created_at DESC,
        end_date DESC NULLS LAST
    )

    SELECT
      m.id, m.member_code, m.full_name, m.phone, m.gender, m.address,
      m.status, m.biometric_enabled, m.created_at, m.updated_at,

      lm.id AS membership_id,

      lm.plan_id,

      lm.start_date,
      lm.end_date,

      lm.status AS membership_status,

      lm.amount AS membership_amount,

      mp.name AS plan_name,
      mp.duration_months,
      mp.price AS plan_price

    FROM members m

    LEFT JOIN latest_membership lm
      ON lm.member_id = m.id

    LEFT JOIN membership_plans mp
      ON mp.id = lm.plan_id

    WHERE
      COALESCE(m.full_name, '') ILIKE $1
      OR COALESCE(m.phone, '') ILIKE $1
      OR COALESCE(m.member_code, '') ILIKE $1

    ORDER BY
      m.created_at DESC
    `,
    [searchValue]
  );

  return result.rows.map((member) => {
    return {
      ...member,

      expiry_date:
        member.end_date || null,

      join_date:
        member.start_date || null,

      membership_start_date:
        member.start_date || null,

      membership_end_date:
        member.end_date || null,

      membership_expiry_date:
        member.end_date || null,

      plan:
        member.plan_name || null,

      membership_plan:
        member.plan_name || null,
    };
  });
}

// ============================================================
// GET MEMBER BY ID
// ============================================================

async function getMemberById(memberId) {
  const result = await db.query(
    `
    WITH latest_membership AS (
      SELECT
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        amount,
        created_at,
        updated_at
      FROM memberships
      WHERE member_id = $1
      ORDER BY
        updated_at DESC,
        created_at DESC,
        end_date DESC NULLS LAST
      LIMIT 1
    )

    SELECT
      m.id, m.member_code, m.full_name, m.phone, m.gender, m.address,
      m.status, m.biometric_enabled, m.created_at, m.updated_at,

      lm.id AS membership_id,

      lm.plan_id,

      lm.start_date,
      lm.end_date,

      lm.status AS membership_status,

      lm.amount AS membership_amount,

      mp.name AS plan_name,
      mp.duration_months,
      mp.price AS plan_price

    FROM members m

    LEFT JOIN latest_membership lm
      ON lm.member_id = m.id

    LEFT JOIN membership_plans mp
      ON mp.id = lm.plan_id

    WHERE m.id = $1

    LIMIT 1
    `,
    [memberId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const member = result.rows[0];

  // ==========================================================
  // CALCULATE CURRENT STATUS FROM memberships.end_date
  // ==========================================================

  let displayStatus = "Unknown";

  if (member.end_date) {
    /*
     * PostgreSQL returns a date that may contain a timestamp.
     *
     * We only compare YYYY-MM-DD.
     */

    const expiryString =
      String(member.end_date)
        .slice(0, 10);

    const today =
      new Date()
        .toLocaleDateString("en-CA");

    if (expiryString < today) {
      displayStatus = "Expired";
    } else {
      displayStatus = "Active";
    }
  }

  return {
    ...member,

    // ========================================================
    // COMPATIBILITY FIELDS
    // ========================================================

    expiry_date:
      member.end_date || null,

    join_date:
      member.start_date || null,

    membership_start_date:
      member.start_date || null,

    membership_end_date:
      member.end_date || null,

    membership_expiry_date:
      member.end_date || null,

    plan:
      member.plan_name || null,

    membership_plan:
      member.plan_name || null,

    current_status:
      displayStatus,

    display_status:
      displayStatus,

    // ========================================================
    // NESTED MEMBERSHIP
    // ========================================================

    membership:
      member.membership_id
        ? {
            id:
              member.membership_id,

            member_id:
              member.id,

            plan_id:
              member.plan_id,

            start_date:
              member.start_date,

            end_date:
              member.end_date,

            status:
              member.membership_status,

            amount:
              member.membership_amount,

            plan_name:
              member.plan_name,

            duration_months:
              member.duration_months,
          }
        : null,
  };
}

// ============================================================
// CREATE MEMBER
// ============================================================

async function createMember(data) {
  const result = await db.query(
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
      $1,
      $2,
      $3,
      $4,
      $5,
      COALESCE($6, 'active'),
      COALESCE($7, false),
      NOW(),
      NOW()
    )
    RETURNING id, member_code, full_name, phone, gender, address,
              status, biometric_enabled, created_at, updated_at
    `,
    [
      data.memberCode ||
        data.member_code ||
        null,

      data.fullName ||
        data.full_name,

      data.phone ||
        null,

      data.gender ||
        null,

      data.address ||
        null,

      data.status ||
        "active",

      data.biometricEnabled ??
        data.biometric_enabled ??
        false,
    ]
  );

  return result.rows[0];
}

// ============================================================
// UPDATE MEMBER
// ============================================================

async function updateMember(memberId, data) {
  const allowedFields = [
    ["fullName", "full_name", data.fullName ?? data.full_name],
    ["phone", "phone", data.phone],
    ["gender", "gender", data.gender],
    ["address", "address", data.address],
    ["status", "status", data.status],
    ["biometricEnabled", "biometric_enabled", data.biometricEnabled ?? data.biometric_enabled],
  ];
  const supplied = allowedFields.filter(([camel, snake]) =>
    Object.prototype.hasOwnProperty.call(data, camel) ||
    Object.prototype.hasOwnProperty.call(data, snake)
  );
  if (!supplied.length) throw new Error("At least one editable member field is required.");

  const values = [memberId];
  const assignments = supplied.map(([camel, column, rawValue]) => {
    let value = rawValue;
    if (camel === "fullName") {
      value = String(rawValue ?? "").trim();
      if (!value) throw new Error("Full name cannot be empty.");
    } else if (camel === "gender" && rawValue) {
      value = String(rawValue).trim().toLowerCase();
      if (!["male", "female", "other"].includes(value)) throw new Error("Invalid gender.");
    } else if (camel === "status") {
      value = String(rawValue ?? "").trim().toLowerCase();
      if (!["active", "expired", "suspended", "inactive"].includes(value)) throw new Error("Invalid member status.");
    } else if (camel === "biometricEnabled" && typeof rawValue !== "boolean") {
      throw new Error("biometricEnabled must be a boolean.");
    } else if ((camel === "phone" || camel === "address") && rawValue === "") {
      value = null;
    }
    values.push(value);
    return `${column} = $${values.length}`;
  });

  const result = await db.query(
    `UPDATE members SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING id`,
    values
  );
  return result.rows[0] ? getMemberById(memberId) : null;
}

// ============================================================
// DELETE MEMBER
// ============================================================

async function deleteMember(memberId) {
  const result = await db.query(
    `
    DELETE FROM members
    WHERE id = $1
    RETURNING id, member_code, full_name, phone, gender, address,
              status, biometric_enabled, created_at, updated_at
    `,
    [memberId]
  );

  return result.rows[0] || null;
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getAllMembers,
  searchMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
