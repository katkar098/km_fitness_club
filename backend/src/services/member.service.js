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
      m.*,

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
      m.*,

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
      OR COALESCE(m.employee_code, '') ILIKE $1
      OR COALESCE(m.biometric_user_id, '') ILIKE $1

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
      m.*,

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
      biometric_user_id,
      employee_code,
      full_name,
      phone,
      email,
      gender,
      date_of_birth,
      address,
      emergency_contact_name,
      emergency_contact_phone,
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
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      COALESCE($12, 'active'),
      COALESCE($13, false),
      NOW(),
      NOW()
    )
    RETURNING *
    `,
    [
      data.memberCode ||
        data.member_code ||
        null,

      data.biometricUserId ||
        data.biometric_user_id ||
        null,

      data.employeeCode ||
        data.employee_code ||
        null,

      data.fullName ||
        data.full_name,

      data.phone ||
        null,

      data.email ||
        null,

      data.gender ||
        null,

      data.dateOfBirth ||
        data.date_of_birth ||
        null,

      data.address ||
        null,

      data.emergencyContactName ||
        data.emergency_contact_name ||
        null,

      data.emergencyContactPhone ||
        data.emergency_contact_phone ||
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
  const updated = await db.transaction(async (client) => {
    const result = await client.query(
      `
      UPDATE members
      SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        gender = COALESCE($4, gender),
        date_of_birth = COALESCE($5, date_of_birth),
        address = COALESCE($6, address),
        emergency_contact_name = COALESCE($7, emergency_contact_name),
        emergency_contact_phone = COALESCE($8, emergency_contact_phone),
        updated_at = NOW()
      WHERE id = $9
      RETURNING id
      `,
      [
        data.fullName ?? data.full_name ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.gender ?? null,
        data.dateOfBirth ?? data.date_of_birth ?? null,
        data.address ?? null,
        data.emergencyContactName ?? data.emergency_contact_name ?? null,
        data.emergencyContactPhone ?? data.emergency_contact_phone ?? null,
        memberId,
      ]
    );

    if (!result.rows[0]) {
      return null;
    }

    let membership = null;

    if (data.updateMembership === true) {
      const startDate = data.startDate ?? data.start_date;
      const expiryDate = data.expiryDate ?? data.endDate ?? data.end_date;

      const isIsoDate = (value) =>
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

      if (!isIsoDate(startDate) || !isIsoDate(expiryDate)) {
        throw new Error("Enter valid membership start and expiry dates.");
      }

      if (expiryDate < startDate) {
        throw new Error("Membership expiry date cannot be before its start date.");
      }

      const latestMembership = await client.query(
        `
        SELECT id
        FROM memberships
        WHERE member_id = $1
        ORDER BY updated_at DESC, created_at DESC, end_date DESC NULLS LAST
        LIMIT 1
        FOR UPDATE
        `,
        [memberId]
      );

      if (!latestMembership.rows[0]) {
        throw new Error("This member has no membership record to update.");
      }

      const membershipResult = await client.query(
        `
        UPDATE memberships
        SET
          start_date = $1,
          end_date = $2,
          status = CASE
            WHEN status = 'cancelled' THEN status
            WHEN $2::date < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END,
          updated_at = NOW()
        WHERE id = $3
        RETURNING id, start_date, end_date, status, plan_id, updated_at
        `,
        [startDate, expiryDate, latestMembership.rows[0].id]
      );

      membership = membershipResult.rows[0];
    }

    return { memberId: result.rows[0].id, membership };
  });

  if (!updated) {
    return null;
  }

  const savedMember = await getMemberById(memberId);

  if (!savedMember || !updated.membership) {
    return savedMember;
  }

  return {
    ...savedMember,
    membership_id: updated.membership.id,
    start_date: updated.membership.start_date,
    end_date: updated.membership.end_date,
    membership_status: updated.membership.status,
    plan_id: updated.membership.plan_id,
    membership_start_date: updated.membership.start_date,
    membership_end_date: updated.membership.end_date,
    membership_expiry_date: updated.membership.end_date,
    expiry_date: updated.membership.end_date,
    join_date: updated.membership.start_date,
  };
}

// ============================================================
// DELETE MEMBER
// ============================================================

async function deleteMember(memberId) {
  const result = await db.query(
    `
    DELETE FROM members
    WHERE id = $1
    RETURNING *
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
