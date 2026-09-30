const express = require("express");
const crypto = require("crypto");

const { query, transaction } = require("../config/db");
const auth = require("../middleware/auth");


const router = express.Router();

router.use(auth);

const normalizeBiometricId = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^0+(\d)/, "$1");

// ============================================================
// HELPERS
// ============================================================

const fail = (status, message) =>
  Object.assign(new Error(message), {
    statusCode: status,
  });

const memberCode = () =>
  `KM-${new Date().getFullYear()}-${crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;

// ============================================================
// DATE HELPERS
// ============================================================

const isValidDateString = (value) => {
  if (!value) return false;

  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
};

const validateMembershipDates = (startDate, expiryDate) => {
  if (!isValidDateString(startDate)) {
    throw fail(
      422,
      "A valid membership start date is required"
    );
  }

  if (!isValidDateString(expiryDate)) {
    throw fail(
      422,
      "A valid membership expiry date is required"
    );
  }

  if (expiryDate < startDate) {
    throw fail(
      422,
      "Expiry date cannot be before the start date"
    );
  }
};

// ============================================================
// BIOMETRIC QUEUE
// ============================================================

const queueBiometricAccessChange = async (
  db,
  memberId,
  action
) => {
  const allowedActions = new Set([
    "enable",
    "disable",
  ]);

  if (!allowedActions.has(action)) {
    throw new Error(
      `Unsafe biometric action requested: ${action}`
    );
  }

  await db.query(
    `
      INSERT INTO biometric_sync_queue(
        member_id,
        action
      )
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM biometric_sync_queue
        WHERE member_id = $1
          AND action = $2
          AND status IN ('pending', 'processing')
      )
    `,
    [memberId, action]
  );
};

// ============================================================
// DASHBOARD
// ============================================================

router.get(
  "/dashboard",
  async (req, res, next) => {
    try {
      const { rows } = await query(`
        SELECT
          count(*) FILTER (
            WHERE status = 'active'
          )::int AS active_members,

          count(*) FILTER (
            WHERE status = 'expired'
          )::int AS expired_members,

          count(*) FILTER (
            WHERE status = 'active'
            AND EXISTS (
              SELECT 1
              FROM memberships ms
              WHERE ms.member_id = members.id
                AND ms.status = 'active'
                AND ms.end_date BETWEEN
                  current_date
                  AND current_date + 7
            )
          )::int AS expiring_soon

        FROM members
        WHERE biometric_machine_member = TRUE
      `);

      const revenue = await query(`
        SELECT
          COALESCE(
            SUM(amount),
            0
          ) AS monthly_revenue

        FROM payments

        WHERE status = 'completed'
          AND paid_at >= date_trunc(
            'month',
            now()
          )
      `);

      res.json({
        success: true,
        data: {
          ...rows[0],
          monthly_revenue:
            revenue.rows[0].monthly_revenue,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// MEMBERSHIP PLANS
// ============================================================

router.get(
  "/plans",
  async (req, res, next) => {
    try {
      const { rows } = await query(`
        SELECT *
        FROM membership_plans
        ORDER BY price, name
      `);

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/plans",
  async (req, res, next) => {
    try {
      const {
        name,
        durationDays,
        price,
        description,
      } = req.body;

      if (
        !name ||
        !Number.isInteger(durationDays) ||
        durationDays < 1 ||
        Number(price) < 0
      ) {
        throw fail(
          422,
          "name, durationDays and a valid price are required"
        );
      }

      const { rows } = await query(
        `
          INSERT INTO membership_plans(
            name,
            duration_days,
            price,
            description
          )
          VALUES($1, $2, $3, $4)
          RETURNING *
        `,
        [
          name.trim(),
          durationDays,
          price,
          description || null,
        ]
      );

      res.status(201).json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/plans/:id",
  async (req, res, next) => {
    try {
      const {
        name,
        durationDays,
        price,
        description,
        isActive,
      } = req.body;

      const { rows } = await query(
        `
          UPDATE membership_plans

          SET
            name = COALESCE(
              $2,
              name
            ),

            duration_days = COALESCE(
              $3,
              duration_days
            ),

            price = COALESCE(
              $4,
              price
            ),

            description = COALESCE(
              $5,
              description
            ),

            is_active = COALESCE(
              $6,
              is_active
            )

          WHERE id = $1

          RETURNING *
        `,
        [
          req.params.id,
          name?.trim(),
          durationDays,
          price,
          description,
          isActive,
        ]
      );

      if (!rows[0]) {
        throw fail(
          404,
          "Plan not found"
        );
      }

      res.json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/biometric/users", (req, res) =>
  res.status(410).json({
    success: false,
    message: "Biometric user discovery is handled by km-sync.",
  })
);

// ============================================================
// MEMBERS
// ============================================================

router.get(
  "/members/unregistered-biometric-users",
  async (req, res, next) => {
    try {
      const { rows } = await query(`
        SELECT biometric_id, name, machine_user_id, member_id, sync_status
        FROM biometric_users
        WHERE sync_status = 'unregistered'
          AND member_id IS NULL
        ORDER BY name ASC NULLS LAST, biometric_id ASC
      `);

      return res.json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (error) {
      console.error("Failed to load unregistered biometric users:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to load unregistered biometric users.",
      });
    }
  }
);

/*
  IMPORTANT FIX:

  Previously this endpoint only joined:

      memberships WHERE status = 'active'

  Therefore after a membership became expired,
  start_date and end_date disappeared completely.

  This version gets the latest membership for each member,
  preferring the active membership when available.

  Therefore expiry information remains visible even after refresh.
*/

router.get(
  "/members",
  async (req, res, next) => {
    try {
      const requestedLimit =
        Number(req.query.limit);

      const limit =
        Number.isFinite(
          requestedLimit
        ) &&
        requestedLimit > 0
          ? Math.min(
              requestedLimit,
              1000
            )
          : 1000;

      const search =
        req.query.search?.trim() ||
        "";

      const { rows } = await query(
        `
          SELECT
            m.*,

            ms.id AS membership_id,
            to_char(ms.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(ms.end_date, 'YYYY-MM-DD') AS end_date,
            ms.status AS membership_status,

            p.name AS plan_name,
            p.duration_days AS plan_duration_days,

            pay.amount AS final_amount,
            pay.payment_method,

            sync.action AS biometric_sync_action,
            sync.status AS biometric_sync_status,
            sync.last_error AS biometric_sync_error,
            sync.processed_at AS biometric_sync_processed_at

          FROM members m

          LEFT JOIN LATERAL (
            SELECT *
            FROM memberships

            WHERE member_id = m.id

            ORDER BY
              updated_at DESC,
              created_at DESC,
              start_date DESC

            LIMIT 1
          ) ms ON TRUE

          LEFT JOIN membership_plans p
            ON p.id = ms.plan_id

          LEFT JOIN LATERAL (
            SELECT
              amount,
              payment_method

            FROM payments

            WHERE payments.member_id =
              m.id

            ORDER BY
              paid_at DESC

            LIMIT 1
          ) pay ON TRUE

          LEFT JOIN LATERAL (
            SELECT
              action,
              status,
              last_error,
              processed_at
            FROM biometric_sync_queue
            WHERE member_id = m.id
            ORDER BY created_at DESC
            LIMIT 1
          ) sync ON TRUE

          WHERE
            m.biometric_machine_member = TRUE

            AND (
              $1 = ''

              OR m.full_name ILIKE
                '%' || $1 || '%'

              OR m.member_code ILIKE
                '%' || $1 || '%'

              OR m.phone ILIKE
                '%' || $1 || '%'
            )

          ORDER BY
            m.created_at DESC

          LIMIT $2
        `,
        [search, limit]
      );

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET SINGLE MEMBER
// ============================================================

router.get(
  "/members/:id",
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `
          SELECT
            m.*,

            ms.id AS membership_id,
            to_char(ms.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(ms.end_date, 'YYYY-MM-DD') AS end_date,
            ms.status AS membership_status,

            p.name AS plan_name,
            p.duration_days AS plan_duration_days,

            pay.amount AS final_amount,
            pay.payment_method,

            sync.action AS biometric_sync_action,
            sync.status AS biometric_sync_status,
            sync.last_error AS biometric_sync_error,
            sync.processed_at AS biometric_sync_processed_at

          FROM members m

          LEFT JOIN LATERAL (
            SELECT *
            FROM memberships

            WHERE member_id = m.id

            ORDER BY
              updated_at DESC,
              created_at DESC,
              start_date DESC

            LIMIT 1
          ) ms ON TRUE

          LEFT JOIN membership_plans p
            ON p.id = ms.plan_id

          LEFT JOIN LATERAL (
            SELECT
              amount,
              payment_method

            FROM payments

            WHERE payments.member_id =
              m.id

            ORDER BY
              paid_at DESC

            LIMIT 1
          ) pay ON TRUE

          LEFT JOIN LATERAL (
            SELECT
              action,
              status,
              last_error,
              processed_at
            FROM biometric_sync_queue
            WHERE member_id = m.id
            ORDER BY created_at DESC
            LIMIT 1
          ) sync ON TRUE

          WHERE
            m.id = $1

            AND
            m.biometric_machine_member = TRUE
        `,
        [req.params.id]
      );

      if (!rows[0]) {
        throw fail(
          404,
          "Member not found"
        );
      }

      const memberships =
        await query(
          `
            SELECT
              ms.*,
              p.name AS plan_name,
              p.duration_days AS plan_duration_days

            FROM memberships ms

            JOIN membership_plans p
              ON p.id = ms.plan_id

            WHERE ms.member_id = $1

            ORDER BY
              ms.start_date DESC,
              ms.created_at DESC
          `,
          [req.params.id]
        );

      res.json({
        success: true,

        data: {
          ...rows[0],
          memberships:
            memberships.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// CREATE NEW MEMBER
// ============================================================

router.post(
  "/members/enroll",
  async (req, res, next) => {
    try {
      const {
        fullName,
        phone,
        email,
        gender,
        dateOfBirth,
        address,
        emergencyContactName,
        emergencyContactPhone,
        biometricUserId,
        planId,
        startDate,
        expiryDate,
        admissionFee,
        discount,
        amount,
        paymentMethod,
        transactionReference,
        notes,
      } = req.body;

      if (!fullName?.trim()) {
        throw fail(
          422,
          "Full name is required"
        );
      }

      if (!planId) {
        throw fail(
          422,
          "planId is required"
        );
      }

      if (!paymentMethod) {
        throw fail(
          422,
          "paymentMethod is required"
        );
      }

      if (!biometricUserId) {
        throw fail(
          422,
          "biometricUserId is required"
        );
      }

      const normalizedBiometricUserId =
        typeof normalizeBiometricId ===
        "function"
          ? normalizeBiometricId(
              biometricUserId
            )
          : String(
              biometricUserId
            ).trim();

      if (!normalizedBiometricUserId) {
        throw fail(
          422,
          "A valid biometric user ID is required"
        );
      }

      const data =
        await transaction(
          async (db) => {
            const planResult =
              await db.query(
                `
                  SELECT *
                  FROM membership_plans

                  WHERE id = $1
                    AND is_active = TRUE

                  FOR UPDATE
                `,
                [planId]
              );

            const plan =
              planResult.rows[0];

            if (!plan) {
              throw fail(
                404,
                "Active plan not found"
              );
            }

            // Serialize claims by normalized biometric ID. The conditional
            // UPDATE below remains the final guard across concurrent admins.
            await db.query(
              "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
              [`member-biometric:${normalizedBiometricUserId}`]
            );

            const existingResult =
              await db.query(
                `
                  SELECT
                    m.*,
                    EXISTS (
                      SELECT 1
                      FROM memberships ms
                      WHERE ms.member_id = m.id
                        AND ms.status = 'active'
                    ) AS has_active_membership
                  FROM members m

                  WHERE biometric_user_id
                    IS NOT NULL

                    AND btrim(
                      biometric_user_id
                    ) <> ''

                    AND regexp_replace(
                      btrim(
                        biometric_user_id
                      ),
                      '^0+(\\d)',
                      '\\1'
                    ) = $1

                  FOR UPDATE
                `,
                [
                  normalizedBiometricUserId,
                ]
              );

            const isNewMember =
              existingResult.rows.length === 0;

            if (
              existingResult.rows[0]
            ) {
              const existingMember =
                existingResult.rows[0];

              if (
                existingMember.created_by_admin_id ||
                existingMember.has_active_membership
              ) {
                throw fail(
                  409,
                  `Biometric user ${normalizedBiometricUserId} is already registered.`
                );
              }

              const updatedMemberResult =
                await db.query(
                  `
                    UPDATE members
                    SET
                      biometric_machine_member = TRUE,
                      full_name = $2,
                      phone = $3,
                      email = $4,
                      gender = $5,
                      date_of_birth = $6,
                      address = $7,
                      emergency_contact_name = $8,
                      emergency_contact_phone = $9,
                      created_by_admin_id = $10,
                      status = 'active',
                      biometric_access_enabled = TRUE,
                      updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                  `,
                  [
                    existingMember.id,
                    fullName.trim(),
                    phone || null,
                    email || null,
                    gender || null,
                    dateOfBirth || null,
                    address || null,
                    emergencyContactName || null,
                    emergencyContactPhone || null,
                    req.user.id,
                  ]
                );

              existingResult.rows[0] =
                updatedMemberResult.rows[0];
            }

            const start =
              startDate ||
              new Date()
                .toISOString()
                .slice(0, 10);

            const explicitExpiry =
              expiryDate || null;

            if (explicitExpiry) {
              validateMembershipDates(
                start,
                explicitExpiry
              );
            }

            const safeAdmissionFee =
              Number(admissionFee) ||
              0;

            const safeDiscount =
              Math.max(
                0,
                Number(discount) || 0
              );

            const calculatedAmount =
              Math.max(
                0,
                Number(plan.price) +
                  safeAdmissionFee -
                  safeDiscount
              );

            const finalAmount =
              amount !== undefined &&
              amount !== null &&
              amount !== ""
                ? Math.max(
                    0,
                    Number(amount) || 0
                  )
                : calculatedAmount;

            const member = existingResult.rows[0] ||
              (await db.query(
                `
                  INSERT INTO members(
                    member_code,
                    biometric_user_id,
                    biometric_machine_member,
                    full_name,
                    phone,
                    email,
                    gender,
                    date_of_birth,
                    address,
                    emergency_contact_name,
                    emergency_contact_phone,
                    created_by_admin_id,
                    status,
                    biometric_access_enabled
                  )

                  VALUES(
                    $1,
                    $2,
                    TRUE,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11,
                    'active',
                    TRUE
                  )

                  RETURNING *
                `,
                [
                  memberCode(),
                  normalizedBiometricUserId,
                  fullName.trim(),
                  phone || null,
                  email || null,
                  gender || null,
                  dateOfBirth || null,
                  address || null,
                  emergencyContactName ||
                    null,
                  emergencyContactPhone ||
                    null,
                  req.user.id,
                ]
              )).rows[0];

            const biometricResult = await db.query(
              `
                UPDATE biometric_users
                SET member_id = $1,
                    sync_status = 'registered'
                WHERE biometric_id::text = $2
                  AND sync_status = 'unregistered'
                  AND member_id IS NULL
                RETURNING
                  biometric_id,
                  name,
                  machine_user_id,
                  member_id,
                  sync_status
              `,
              [member.id, String(biometricUserId).trim()]
            );

            if (!biometricResult.rows[0]) {
              throw fail(
                409,
                "The selected biometric user is no longer available for registration. It may already be registered."
              );
            }

            const membershipResult =
              await db.query(
                `
                  INSERT INTO memberships(
                    member_id,
                    plan_id,
                    start_date,
                    end_date,
                    status
                  )

                  VALUES(
                    $1,
                    $2,
                    $3::date,

                    COALESCE(
                      $5::date,

                      (
                        $3::date +
                        (
                          (
                            $4::int - 1
                          ) *
                          INTERVAL '1 day'
                        )
                      )::date
                    ),

                    'active'
                  )

                  RETURNING *
                `,
                [
                  member.id,
                  plan.id,
                  start,
                  Number(
                    plan.duration_days
                  ),
                  explicitExpiry,
                ]
              );

            const membership =
              membershipResult.rows[0];

            const paymentResult =
              await db.query(
                `
                  INSERT INTO payments(
                    member_id,
                    membership_id,
                    receipt_type,
                    amount,
                    base_amount,
                    admission_fee,
                    discount,
                    payment_method,
                    transaction_reference,
                    notes,
                    status
                  )

                  VALUES(
                    $1,
                    $2,
                    'new_membership',
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    'completed'
                  )

                  RETURNING *
                `,
                [
                  member.id,
                  membership.id,
                  finalAmount,
                  Number(plan.price),
                  safeAdmissionFee,
                  safeDiscount,
                  paymentMethod,
                  transactionReference ||
                    null,
                  notes || null,
                ]
              );

            const payment =
              paymentResult.rows[0];

            await db.query(
              `
                UPDATE members

                SET
                  status = 'active',
                  biometric_access_enabled = TRUE,
                  biometric_machine_member = TRUE

                WHERE id = $1
              `,
              [member.id]
            );

            if (isNewMember) {
              const syncResult = await db.query(
                `
                  INSERT INTO biometric_sync_queue(
                    member_id,
                    action
                  )
                  VALUES($1, 'create')
                  RETURNING action, status, last_error, processed_at
                `,
                [member.id]
              );

              Object.assign(member, {
                biometric_sync_action:
                  syncResult.rows[0].action,
                biometric_sync_status:
                  syncResult.rows[0].status,
                biometric_sync_error:
                  syncResult.rows[0].last_error,
                biometric_sync_processed_at:
                  syncResult.rows[0].processed_at,
              });
            } else {
              await queueBiometricAccessChange(
                db,
                member.id,
                "enable"
              );
            }

            return {
              member,
              biometricUser: biometricResult.rows[0],
              membership,
              payment,
            };
          }
        );
      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: /biometric/i.test(`${error.constraint || ""} ${error.detail || ""}`)
            ? "This biometric user is already registered to an existing member."
            : "A member with this information already exists.",
        });
      }

      if (error.code) {
        console.error("Member enrollment database error:", error);
        return res.status(500).json({
          success: false,
          message: "Unable to create the member due to a database error. Please try again.",
        });
      }

      next(error);
    }
  }
);

// ============================================================
// UPDATE MEMBER
// ============================================================

router.put(
  "/members/:id",
  async (req, res, next) => {
    try {
      const {
        fullName,
        phone,
        email,
        gender,
        dateOfBirth,
        address,
        emergencyContactName,
        emergencyContactPhone,
        biometricUserId,
        status,
        updateMembership,
        plan,
        duration,
        startDate,
        expiryDate,
        finalAmount,
        paymentMethod,
      } = req.body;

      const normalizedGender = String(gender || "").trim().toLowerCase();
      const savedGender = ["male", "female", "other"].includes(normalizedGender)
        ? normalizedGender
        : gender;
      const normalizedStatus = String(status || "").trim().toLowerCase();
      const savedStatus = ["active", "expired", "suspended", "inactive"].includes(
        normalizedStatus
      )
        ? normalizedStatus
        : null;
      const normalizedPaymentMethod = String(paymentMethod || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

      const savedMember = await transaction(async (client) => {
        const memberResult = await client.query(
          `
            UPDATE members
            SET
              full_name = COALESCE(NULLIF($2, ''), full_name),
              phone = COALESCE(NULLIF($3, ''), phone),
              email = COALESCE(NULLIF($4, ''), email),
              gender = COALESCE(NULLIF($5, ''), gender),
              date_of_birth = COALESCE(NULLIF($6, '')::date, date_of_birth),
              address = COALESCE(NULLIF($7, ''), address),
              emergency_contact_name = COALESCE(NULLIF($8, ''), emergency_contact_name),
              emergency_contact_phone = COALESCE(NULLIF($9, ''), emergency_contact_phone),
              biometric_user_id = COALESCE(NULLIF($10, ''), biometric_user_id),
              status = COALESCE(NULLIF($11, ''), status),
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [
            req.params.id,
            fullName,
            phone,
            email,
            savedGender,
            dateOfBirth,
            address,
            emergencyContactName,
            emergencyContactPhone,
            biometricUserId,
            savedStatus,
          ]
        );

        if (!memberResult.rows[0]) {
          throw fail(404, "Member not found");
        }

        let membership = null;

        if (updateMembership === true) {
          const currentResult = await client.query(
            `
              SELECT *
              FROM memberships
              WHERE member_id = $1
              ORDER BY updated_at DESC, created_at DESC, start_date DESC
              LIMIT 1
              FOR UPDATE
            `,
            [req.params.id]
          );

          const current = currentResult.rows[0];
          if (!current) {
            throw fail(404, "Membership record not found for this member");
          }

          let resolvedPlanId = current.plan_id;
          if (plan) {
            const planResult = await client.query(
              `
                SELECT id
                FROM membership_plans
                WHERE LOWER(name) = LOWER($1) AND is_active = TRUE
                LIMIT 1
              `,
              [plan]
            );
            if (planResult.rows[0]) resolvedPlanId = planResult.rows[0].id;
          }

          const targetStartDate = String(startDate || current.start_date).slice(0, 10);
          const targetExpiryDate = String(expiryDate || current.end_date).slice(0, 10);
          validateMembershipDates(targetStartDate, targetExpiryDate);

          const membershipResult = await client.query(
            `
              UPDATE memberships
              SET
                plan_id = $2,
                start_date = $3::date,
                end_date = $4::date,
                status = CASE
                  WHEN status = 'cancelled' THEN status
                  WHEN $4::date < CURRENT_DATE THEN 'expired'
                  ELSE 'active'
                END,
                updated_at = NOW()
              WHERE id = $1
              RETURNING id, plan_id, start_date, end_date, status, updated_at
            `,
            [current.id, resolvedPlanId, targetStartDate, targetExpiryDate]
          );
          membership = membershipResult.rows[0];
        }

        if (
          updateMembership === true &&
          (finalAmount !== undefined || paymentMethod)
        ) {
          const paymentResult = await client.query(
            `
              SELECT id, amount, payment_method
              FROM payments
              WHERE member_id = $1
              ORDER BY paid_at DESC
              LIMIT 1
              FOR UPDATE
            `,
            [req.params.id]
          );

          if (paymentResult.rows[0]) {
            await client.query(
              `
                UPDATE payments
                SET
                  amount = COALESCE($2, amount),
                  payment_method = COALESCE(NULLIF($3, ''), payment_method)
                WHERE id = $1
              `,
              [
                paymentResult.rows[0].id,
                finalAmount ?? paymentResult.rows[0].amount,
                normalizedPaymentMethod || paymentResult.rows[0].payment_method,
              ]
            );
          }
        }

        const responseResult = await client.query(
          `
            SELECT
              m.*,
              ms.id AS membership_id,
              ms.plan_id,
              ms.start_date,
              ms.end_date,
              ms.status AS membership_status,
              p.name AS plan_name,
              p.duration_days AS plan_duration_days,
              pay.amount AS final_amount,
              pay.payment_method
            FROM members m
            LEFT JOIN LATERAL (
              SELECT *
              FROM memberships
              WHERE member_id = m.id
              ORDER BY updated_at DESC, created_at DESC, start_date DESC
              LIMIT 1
            ) ms ON TRUE
            LEFT JOIN membership_plans p ON p.id = ms.plan_id
            LEFT JOIN LATERAL (
              SELECT amount, payment_method
              FROM payments
              WHERE member_id = m.id
              ORDER BY paid_at DESC
              LIMIT 1
            ) pay ON TRUE
            WHERE m.id = $1
          `,
          [req.params.id]
        );

        const row = responseResult.rows[0];
        return {
          ...row,
          membership_start_date: row.start_date || null,
          membership_end_date: row.end_date || null,
          membership_expiry_date: row.end_date || null,
          expiry_date: row.end_date || null,
          join_date: row.start_date || null,
          membership,
        };
      });

      res.json({
        success: true,
        message: "Member updated successfully",
        data: savedMember,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// RENEW MEMBERSHIP
// ============================================================

/*
  IMPORTANT:

  This endpoint now fully supports manually selected:

    startDate
    expiryDate

  The expiry date sent by the frontend is stored exactly as selected.

  It will NOT be recalculated when the page refreshes.
*/

router.post(
  "/members/:id/renew",
  async (req, res, next) => {
    try {
      const {
        planId,
        startDate,
        expiryDate,
        amount,
        baseAmount,
        discount,
        paymentMethod,
        transactionReference,
        notes,
      } = req.body;

      if (!planId) {
        throw fail(
          422,
          "planId is required"
        );
      }

      if (!paymentMethod) {
        throw fail(
          422,
          "paymentMethod is required"
        );
      }

      // ----------------------------------------------------
      // RENEWAL DATE
      // ----------------------------------------------------

      const renewalStartDate =
        startDate ||
        new Date()
          .toISOString()
          .slice(0, 10);

      if (
        !isValidDateString(
          renewalStartDate
        )
      ) {
        throw fail(
          422,
          "Invalid renewal start date"
        );
      }

      // Manual expiry is optional.
      // If frontend sends it, that exact date is saved.
      const manualExpiryDate =
        expiryDate || null;

      if (manualExpiryDate) {
        validateMembershipDates(
          renewalStartDate,
          manualExpiryDate
        );
      }

      const data =
        await transaction(
          async (db) => {
            // ------------------------------------------------
            // MEMBER
            // ------------------------------------------------

            const memberResult =
              await db.query(
                `
                  SELECT *
                  FROM members

                  WHERE id = $1

                  FOR UPDATE
                `,
                [req.params.id]
              );

            const member =
              memberResult.rows[0];

            if (!member) {
              throw fail(
                404,
                "Member not found"
              );
            }

            // ------------------------------------------------
            // PLAN
            // ------------------------------------------------

            const planResult =
              await db.query(
                `
                  SELECT *
                  FROM membership_plans

                  WHERE
                    id = $1

                    AND
                    is_active = TRUE
                `,
                [planId]
              );

            const plan =
              planResult.rows[0];

            if (!plan) {
              throw fail(
                404,
                "Active plan not found"
              );
            }

            // ------------------------------------------------
            // EXPIRE OLD ACTIVE MEMBERSHIP
            // ------------------------------------------------

            await db.query(
              `
                UPDATE memberships

                SET status = 'expired'

                WHERE member_id = $1
                  AND status = 'active'
              `,
              [member.id]
            );

            // ------------------------------------------------
            // CREATE NEW MEMBERSHIP
            //
            // Manual expiry date ALWAYS wins.
            //
            // If no manual expiry date is sent:
            //
            // expiry =
            // start date +
            // plan duration - 1 day
            // ------------------------------------------------

            const membershipResult =
              await db.query(
                `
                  INSERT INTO memberships(
                    member_id,
                    plan_id,
                    start_date,
                    end_date,
                    status
                  )

                  VALUES(
                    $1,
                    $2,
                    $3::date,

                    COALESCE(
                      $5::date,

                      (
                        $3::date +
                        (
                          (
                            $4::int - 1
                          ) *
                          INTERVAL '1 day'
                        )
                      )::date
                    ),

                    'active'
                  )

                  RETURNING *
                `,
                [
                  member.id,
                  plan.id,
                  renewalStartDate,
                  Number(
                    plan.duration_days
                  ),
                  manualExpiryDate,
                ]
              );

            const membership =
              membershipResult.rows[0];

            // ------------------------------------------------
            // PAYMENT
            // ------------------------------------------------

            const finalAmount =
              amount !== undefined &&
              amount !== null &&
              amount !== ""
                ? Math.max(
                    0,
                    Number(amount) || 0
                  )
                : Number(plan.price);

            const paymentResult =
              await db.query(
                `
                  INSERT INTO payments(
                    member_id,
                    membership_id,
                    receipt_type,
                    amount,
                    base_amount,
                    admission_fee,
                    discount,
                    payment_method,
                    transaction_reference,
                    notes,
                    status
                  )

                  VALUES(
                    $1,
                    $2,
                    'renewal',
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    'completed'
                  )

                  RETURNING *
                `,
                [
                  member.id,
                  membership.id,
                  finalAmount,
                  Number(baseAmount ?? finalAmount),
                  0,
                  Number(discount || 0),
                  paymentMethod,
                  transactionReference ||
                    null,
                  notes || null,
                ]
              );

            const payment =
              paymentResult.rows[0];

            // ------------------------------------------------
            // RE-ACTIVATE MEMBER
            // ------------------------------------------------

            const updatedMemberResult =
              await db.query(
                `
                  UPDATE members

                  SET
                    status = 'active',

                    biometric_access_enabled =
                      TRUE,

                    biometric_machine_member =
                      TRUE

                  WHERE id = $1

                  RETURNING *
                `,
                [member.id]
              );

            const updatedMember =
              updatedMemberResult.rows[0];

            // ------------------------------------------------
            // QUEUE BIOMETRIC ENABLE
            // ------------------------------------------------

            await queueBiometricAccessChange(
              db,
              member.id,
              "enable"
            );

            const syncResult = await db.query(
              `
                SELECT
                  action,
                  status,
                  last_error,
                  processed_at
                FROM biometric_sync_queue
                WHERE member_id = $1
                ORDER BY created_at DESC
                LIMIT 1
              `,
              [member.id]
            );

            const sync = syncResult.rows[0];
            Object.assign(updatedMember, {
              biometric_sync_action:
                sync?.action || null,
              biometric_sync_status:
                sync?.status || null,
              biometric_sync_error:
                sync?.last_error || null,
              biometric_sync_processed_at:
                sync?.processed_at || null,
            });

            // ------------------------------------------------
            // AUDIT
            // ------------------------------------------------

            return {
              member:
                updatedMember,

              membership,

              payment,

            };
          }
        );
      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PAYMENTS
// ============================================================

/*
  FIX: this previously used

      JOIN members m ON m.id = pay.member_id

  which is an INNER join. Any payment row with member_id = NULL
  (an "Other Income" entry that isn't linked to a registered
  member — see payment.routes.js / payment.controller.js) would
  be silently excluded from every response, even though the row
  saved fine in the database. It would look exactly like the
  entry "disappeared on refresh" when it was actually the read
  query dropping it.

  Switched to LEFT JOIN so unlinked payments still come back;
  m.full_name / m.member_code are simply null for those rows,
  which the frontend already treats as "not a registered member".
*/

router.get(
  "/payments",
  async (req, res, next) => {
    try {
      const { rows } = await query(`
        SELECT
          pay.*,

          m.full_name,
          m.member_code

        FROM payments pay

        LEFT JOIN members m
          ON m.id = pay.member_id

        ORDER BY
          pay.paid_at DESC

        LIMIT 200
      `);

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Billing reset is a temporary view cutoff, not a destructive deletion of payment history.
router.get("/billing/reset", (req, res) => {
  res.json({ success: true, data: { resetAt: null } });
});

router.post("/billing/reset", (req, res) => {
  res.status(201).json({ success: true, data: { resetAt: new Date().toISOString() } });
});


// ============================================================
// DELETE MEMBER
// ============================================================

router.delete(
  "/members/:id",
  async (req, res, next) => {
    try {
      const data =
        await transaction(
          async (db) => {
            const memberResult =
              await db.query(
                `
                  SELECT *
                  FROM members

                  WHERE id = $1

                  FOR UPDATE
                `,
                [req.params.id]
              );

            if (
              !memberResult.rows.length
            ) {
              throw fail(
                404,
                "Member not found"
              );
            }

            const member =
              memberResult.rows[0];

            await db.query(
              `
                DELETE FROM biometric_sync_queue

                WHERE member_id = $1
              `,
              [member.id]
            );

            await db.query(
              `
                UPDATE payments
                SET
                  member_id = NULL,
                  membership_id = NULL
                WHERE member_id = $1
              `,
              [member.id]
            );

            await db.query(
              `
                DELETE FROM memberships

                WHERE member_id = $1
              `,
              [member.id]
            );

            await db.query(
              `
                DELETE FROM members

                WHERE id = $1
              `,
              [member.id]
            );

            return {
              id: member.id,
            };
          }
        );

      res.json({
        success: true,

        message:
          "Member permanently deleted from Supabase. Biometric machine user was not deleted.",

        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
