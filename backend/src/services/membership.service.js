const db = require("../config/db");

// ============================================================
// GET ALL PLANS
// ============================================================

async function getAllPlans() {
  const result = await db.query(`
    SELECT *
    FROM membership_plans
    ORDER BY name ASC
  `);

  return result.rows;
}

// ============================================================
// GET PLAN
// ============================================================

async function getPlanById(id) {
  const result = await db.query(
    `
    SELECT *
    FROM membership_plans
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
}

// ============================================================
// CREATE PLAN
// ============================================================

async function createPlan(data) {
  const result = await db.query(
    `
    INSERT INTO membership_plans (
      name,
      duration_months,
      price,
      description,
      features,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      NOW(),
      NOW()
    )
    RETURNING *
    `,
    [
      data.name,
      data.durationMonths,
      data.price,
      data.description || null,
      data.features || {},
    ]
  );

  return result.rows[0];
}

// ============================================================
// UPDATE PLAN
// ============================================================

async function updatePlan(
  id,
  data
) {
  const result = await db.query(
    `
    UPDATE membership_plans
    SET
      name =
        COALESCE($1, name),

      duration_months =
        COALESCE(
          $2,
          duration_months
        ),

      price =
        COALESCE($3, price),

      description =
        COALESCE(
          $4,
          description
        ),

      features =
        COALESCE(
          $5,
          features
        ),

      updated_at = NOW()

    WHERE id = $6

    RETURNING *
    `,
    [
      data.name || null,
      data.durationMonths || null,
      data.price ?? null,
      data.description || null,
      data.features || null,
      id,
    ]
  );

  return result.rows[0];
}

// ============================================================
// DELETE PLAN
// ============================================================

async function deletePlan(id) {
  const result = await db.query(
    `
    DELETE FROM membership_plans
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
}

// ============================================================
// GET MEMBERSHIPS
// ============================================================

async function getAllMemberships() {
  const result = await db.query(`
    SELECT
      m.*,
      mp.name AS plan_name,
      mp.price AS plan_price,
      mem.member_code,
      biometric.biometric_id::text AS employee_code,
      mem.full_name,
      mem.phone
    FROM memberships m
    JOIN members mem
      ON mem.id = m.member_id
    LEFT JOIN membership_plans mp
      ON mp.id = m.plan_id
    LEFT JOIN LATERAL (
      SELECT biometric_id FROM biometric_users
      WHERE member_id = mem.id ORDER BY biometric_id LIMIT 1
    ) biometric ON TRUE
    ORDER BY m.start_date DESC
  `);

  return result.rows;
}

// ============================================================
// GET MEMBERSHIP
// ============================================================

async function getMembershipById(id) {
  const result = await db.query(
    `
    SELECT
      m.*,
      mp.name AS plan_name,
      mem.member_code,
      biometric.biometric_id::text AS employee_code,
      mem.full_name,
      mem.phone
    FROM memberships m
    JOIN members mem
      ON mem.id = m.member_id
    LEFT JOIN membership_plans mp
      ON mp.id = m.plan_id
    LEFT JOIN LATERAL (
      SELECT biometric_id FROM biometric_users
      WHERE member_id = mem.id ORDER BY biometric_id LIMIT 1
    ) biometric ON TRUE
    WHERE m.id = $1
    `,
    [id]
  );

  return result.rows[0];
}

// ============================================================
// ASSIGN MEMBERSHIP
//
// IMPORTANT:
// USE EXACT USER-PROVIDED DATES.
// ============================================================

async function assignMembership(data) {
  const startDate =
    data.startDate;

  const endDate =
    data.endDate;

  if (!startDate) {
    throw new Error(
      "Membership start date is required."
    );
  }

  if (!endDate) {
    throw new Error(
      "Membership expiry date is required."
    );
  }

  if (
    new Date(endDate) <
    new Date(startDate)
  ) {
    throw new Error(
      "Expiry date cannot be before start date."
    );
  }

  const result = await db.query(
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
      $1,
      $2,
      $3,
      $4,
      'active',
      $5,
      NOW(),
      NOW()
    )
    RETURNING *
    `,
    [
      data.memberId,
      data.planId,
      startDate,
      endDate,
      Number(data.amount || 0),
    ]
  );

  return result.rows[0];
}

// ============================================================
// UPDATE MEMBERSHIP
// ============================================================

async function updateMembership(
  id,
  data
) {
  const result = await db.query(
    `
    UPDATE memberships
    SET
      status =
        COALESCE(
          $1,
          status
        ),

      start_date =
        COALESCE(
          $2,
          start_date
        ),

      end_date =
        COALESCE(
          $3,
          end_date
        ),

      updated_at = NOW()

    WHERE id = $4

    RETURNING *
    `,
    [
      data.status || null,
      data.startDate || null,
      data.endDate || null,
      id,
    ]
  );

  return result.rows[0];
}

// ============================================================
// RENEW MEMBERSHIP
//
// EXACT MANUAL START + EXPIRY
// ============================================================

async function renewMembership(
  id,
  data
) {
  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const currentResult =
      await client.query(
        `
        SELECT *
        FROM memberships
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

    if (
      currentResult.rows.length === 0
    ) {
      throw new Error(
        "Membership not found."
      );
    }

    const current =
      currentResult.rows[0];

    const startDate =
      data.startDate;

    const expiryDate =
      data.expiryDate;

    if (!startDate) {
      throw new Error(
        "Renewal start date is required."
      );
    }

    if (!expiryDate) {
      throw new Error(
        "Renewal expiry date is required."
      );
    }

    if (
      new Date(expiryDate) <
      new Date(startDate)
    ) {
      throw new Error(
        "Renewal expiry date cannot be before renewal start date."
      );
    }

    const result =
      await client.query(
        `
        UPDATE memberships
        SET
          plan_id =
            COALESCE(
              $1,
              plan_id
            ),

          start_date = $2,

          end_date = $3,

          status = 'active',

          amount =
            COALESCE(
              $4,
              amount
            ),

          updated_at = NOW()

        WHERE id = $5

        RETURNING *
        `,
        [
          data.planId ||
            current.plan_id,

          startDate,

          expiryDate,

          data.amount != null
            ? Number(data.amount)
            : null,

          id,
        ]
      );

    await client.query(
      `
      UPDATE members
      SET
        status = 'active',
        biometric_enabled = true,
        updated_at = NOW()
      WHERE id = $1
      `,
      [current.member_id]
    );

    await client.query(
      "COMMIT"
    );

    return result.rows[0];
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// CANCEL
// ============================================================

async function cancelMembership(id) {
  const result = await db.query(
    `
    UPDATE memberships
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
}

// ============================================================
// EXPIRING
// ============================================================

async function getExpiringMemberships() {
  const result = await db.query(`
    SELECT
      ms.*,
      m.member_code,
      biometric.biometric_id::text AS employee_code,
      m.full_name,
      m.phone
    FROM memberships ms
    JOIN members m
      ON m.id = ms.member_id
    LEFT JOIN LATERAL (
      SELECT biometric_id FROM biometric_users
      WHERE member_id = m.id ORDER BY biometric_id LIMIT 1
    ) biometric ON TRUE
    WHERE
      ms.status = 'active'
      AND ms.end_date
        BETWEEN CURRENT_DATE
        AND CURRENT_DATE + INTERVAL '7 days'
    ORDER BY ms.end_date ASC
  `);

  return result.rows;
}

// ============================================================
// EXPIRED
// ============================================================

async function getExpiredMemberships() {
  const result = await db.query(`
    SELECT
      ms.*,
      m.member_code,
      biometric.biometric_id::text AS employee_code,
      m.full_name,
      m.phone
    FROM memberships ms
    JOIN members m
      ON m.id = ms.member_id
    LEFT JOIN LATERAL (
      SELECT biometric_id FROM biometric_users
      WHERE member_id = m.id ORDER BY biometric_id LIMIT 1
    ) biometric ON TRUE
    WHERE
      ms.end_date < CURRENT_DATE
    ORDER BY ms.end_date DESC
  `);

  return result.rows;
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,

  getAllMemberships,
  getMembershipById,

  assignMembership,
  updateMembership,
  renewMembership,
  cancelMembership,

  getExpiringMemberships,
  getExpiredMemberships,
};
