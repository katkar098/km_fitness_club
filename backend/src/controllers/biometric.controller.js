const {
  getUsers,
  getStatus,
  deleteUserByBiometricId,
} = require("../services/zkDevice.service");

const { query } = require("../config/db");

/*
|--------------------------------------------------------------------------
| NORMALIZE BIOMETRIC ID
|--------------------------------------------------------------------------
|
| Examples:
|
| 3
| 03
| 0003
|
| All are treated as:
|
| 3
|
*/

function normalizeId(value) {
  return String(value || "")
    .trim()
    .replace(/^0+(\d)/, "$1");
}

/*
|--------------------------------------------------------------------------
| GET DIRECT DEVICE USERS
|--------------------------------------------------------------------------
*/

async function getDeviceUsers(req, res, next) {
  try {
    const deviceUsers =
      await getUsers();

    const { rows: members } =
      await query(`
        SELECT
          biometric_id::text AS biometric_user_id
        FROM biometric_users
        WHERE member_id IS NOT NULL
      `);

    const registeredIds =
      new Set(
        members.map((member) =>
          normalizeId(
            member.biometric_user_id
          )
        )
      );

    /*
     * Only show users physically present
     * on biometric machine but not registered
     * in the members table.
     */

    const availableUsers =
      deviceUsers
        .filter((user) => {
          const biometricId =
            normalizeId(
              user.biometric_user_id
            );

          return (
            biometricId &&
            !registeredIds.has(
              biometricId
            )
          );
        })
        .map((user) => ({
          ...user,
          source: "biometric_machine",
        }))
        .sort((a, b) =>
          String(
            a.biometric_user_id
          ).localeCompare(
            String(
              b.biometric_user_id
            ),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        );

    return res.json({
      success: true,

      data:
        availableUsers,

      count:
        availableUsers.length,

      device: {
        ip:
          process.env.ZK_DEVICE_IP ||
          "192.168.0.201",

        port:
          Number(
            process.env.ZK_DEVICE_PORT ||
            4370
          ),

        connected: true,
      },
    });

  } catch (error) {
    console.error(
      "Direct biometric device error:",
      error
    );

    error.statusCode = 503;

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| DEVICE STATUS
|--------------------------------------------------------------------------
*/

async function getDeviceStatus(
  req,
  res,
  next
) {
  try {
    const status =
      await getStatus();

    return res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    console.error(
      "Biometric device status error:",
      error
    );

    error.statusCode = 503;

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| TEST DEVICE
|--------------------------------------------------------------------------
*/

async function testDevice(
  req,
  res,
  next
) {
  try {
    const users =
      await getUsers();

    return res.json({
      success: true,

      message:
        "Biometric machine connection successful.",

      data: {
        ip:
          process.env.ZK_DEVICE_IP ||
          "192.168.0.201",

        port:
          Number(
            process.env.ZK_DEVICE_PORT ||
            4370
          ),

        userCount:
          users.length,

        users,
      },
    });

  } catch (error) {
    console.error(
      "Biometric device test failed:",
      error
    );

    error.statusCode = 503;

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| DEVICE SYNC
|--------------------------------------------------------------------------
*/

async function syncDevice(
  req,
  res,
  next
) {
  try {
    const users =
      await getUsers();

    return res.json({
      success: true,

      message:
        "Biometric device read successfully.",

      count:
        users.length,

      data:
        users,
    });

  } catch (error) {
    console.error(
      "Biometric device sync failed:",
      error
    );

    error.statusCode = 503;

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| DELETE SINGLE BIOMETRIC USER
|--------------------------------------------------------------------------
|
| DELETE /api/biometric/:memberId
|
| Gets member biometric_user_id from database
| and deletes that exact user from the biometric
| machine.
|
*/

async function removeBiometric(
  req,
  res,
  next
) {
  try {
    const {
      memberId,
    } = req.params;

    const { rows } =
      await query(
        `
        SELECT
          m.id,
          biometric.biometric_id::text AS biometric_user_id,
          m.full_name
        FROM members m
        LEFT JOIN LATERAL (
          SELECT biometric_id
          FROM biometric_users
          WHERE member_id = m.id
          ORDER BY biometric_id
          LIMIT 1
        ) biometric ON TRUE
        WHERE m.id = $1
        LIMIT 1
        `,
        [
          memberId,
        ]
      );

    if (
      rows.length === 0
    ) {
      return res.status(404).json({
        success: false,

        message:
          "Member not found.",
      });
    }

    const member =
      rows[0];

    const biometricUserId =
      normalizeId(
        member.biometric_user_id
      );

    if (!biometricUserId) {
      return res.status(400).json({
        success: false,

        message:
          "This member does not have a biometric user ID.",
      });
    }

    console.log("");
    console.log(
      "=============================================="
    );

    console.log(
      "MANUAL BIOMETRIC DELETE"
    );

    console.log(
      "Member:",
      member.full_name
    );

    console.log(
      "Biometric ID:",
      biometricUserId
    );

    console.log(
      "=============================================="
    );

    const result =
      await deleteUserByBiometricId(
        biometricUserId
      );

    /*
     * If user was deleted successfully,
     * or already does not exist,
     * disable biometric in database.
     */

    if (
      result.deleted ||
      result.alreadyMissing
    ) {
      await query(
        `
        UPDATE members
        SET
          biometric_enabled = false,
          updated_at = NOW()
        WHERE id = $1
        `,
        [
          member.id,
        ]
      );
    }

    return res.json({
      success: true,

      message:
        result.deleted
          ? "Member deleted from biometric machine successfully."
          : "Member was already not present on the biometric machine.",

      data:
        result,
    });

  } catch (error) {
    console.error(
      "Remove biometric error:",
      error
    );

    error.statusCode = 503;

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| GET EXPIRED MEMBERS
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| The expiry date comes from:
|
| memberships.end_date
|
| We only check the LATEST membership of every member.
|
| This prevents a renewed member from being deleted because
| they have an old expired membership.
|
| Example:
|
| Old membership:
| end_date = 2026-07-31
|
| New membership:
| end_date = 2026-12-31
|
| Member will NOT be deleted.
|
*/

async function getExpiredMembers() {
  const result =
    await query(`
      WITH latest_memberships AS (
        SELECT DISTINCT ON (member_id)
          member_id,
          id AS membership_id,
          start_date,
          end_date,
          status,
          created_at
        FROM memberships

        WHERE end_date IS NOT NULL

        ORDER BY
          member_id,
          end_date DESC,
          created_at DESC
      )

      SELECT
        m.id,
        m.full_name,
        m.member_code,
        biometric.biometric_id::text AS biometric_user_id,
        m.status AS member_status,
        m.biometric_enabled,

        lm.membership_id,
        lm.start_date,
        lm.end_date,
        lm.status AS membership_status

      FROM members m

      INNER JOIN latest_memberships lm
        ON lm.member_id = m.id

      INNER JOIN LATERAL (
        SELECT biometric_id
        FROM biometric_users
        WHERE member_id = m.id
        ORDER BY biometric_id
        LIMIT 1
      ) biometric ON TRUE

      WHERE
        lm.end_date < CURRENT_DATE

      ORDER BY
        lm.end_date ASC,
        m.full_name ASC
    `);

  return result.rows;
}

/*
|--------------------------------------------------------------------------
| PROCESS ONE EXPIRED MEMBER
|--------------------------------------------------------------------------
|
| 1. Delete member from biometric machine.
| 2. If deleted successfully, disable biometric in database.
| 3. Change member status to expired.
|
*/

async function processExpiredMember(
  member
) {
  const biometricUserId =
    normalizeId(
      member.biometric_user_id
    );

  if (!biometricUserId) {
    throw new Error(
      "Member does not have a valid biometric user ID."
    );
  }

  console.log("");
  console.log(
    "-----------------------------------------------"
  );

  console.log(
    "PROCESSING EXPIRED MEMBER"
  );

  console.log(
    "Name:",
    member.full_name
  );

  console.log(
    "Member Code:",
    member.member_code
  );

  console.log(
    "Biometric ID:",
    biometricUserId
  );

  console.log(
    "Membership End Date:",
    member.end_date
  );

  console.log(
    "Deleting from biometric machine..."
  );

  /*
   * DELETE USER FROM DEVICE
   */

  const deleteResult =
    await deleteUserByBiometricId(
      biometricUserId
    );

  /*
   * Update database only after the biometric
   * operation succeeded or the user was already
   * missing from the machine.
   */

  if (
    deleteResult.deleted ||
    deleteResult.alreadyMissing
  ) {
    await query(
      `
      UPDATE members
      SET
        biometric_enabled = false,
        status = 'expired',
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        member.id,
      ]
    );
  }

  console.log(
    "Expired member processed successfully."
  );

  return {
    memberId:
      member.id,

    fullName:
      member.full_name,

    memberCode:
      member.member_code,

    biometricUserId,

    expiryDate:
      member.end_date,

    success: true,

    deleted:
      deleteResult.deleted === true,

    alreadyMissing:
      deleteResult.alreadyMissing === true,

    machineUid:
      deleteResult.machineUid ||
      null,

    message:
      deleteResult.message ||
      (
        deleteResult.deleted
          ? "Member deleted from biometric machine."
          : "Member already missing from biometric machine."
      ),
  };
}

/*
|--------------------------------------------------------------------------
| DELETE ALL EXPIRED MEMBERS
|--------------------------------------------------------------------------
|
| POST /api/biometric/delete-expired
|
| This endpoint:
|
| 1. Finds members whose latest membership has expired.
| 2. Deletes them from biometric machine.
| 3. Sets biometric_enabled = false.
| 4. Sets member status = expired.
|
*/

async function deleteExpiredMembers(
  req,
  res,
  next
) {
  try {
    console.log("");
    console.log(
      "================================================="
    );

    console.log(
      "CHECKING EXPIRED MEMBERS"
    );

    console.log(
      "================================================="
    );

    const expiredMembers =
      await getExpiredMembers();

    console.log(
      "Expired members found:",
      expiredMembers.length
    );

    const results = [];

    for (
      const member
      of expiredMembers
    ) {
      try {
        const result =
          await processExpiredMember(
            member
          );

        results.push(
          result
        );

      } catch (error) {
        console.error(
          `Failed for ${member.full_name}:`,
          error.message
        );

        results.push({
          memberId:
            member.id,

          fullName:
            member.full_name,

          memberCode:
            member.member_code,

          biometricUserId:
            member.biometric_user_id,

          expiryDate:
            member.end_date,

          success: false,

          deleted: false,

          alreadyMissing: false,

          error:
            error.message,
        });
      }
    }

    const deleted =
      results.filter(
        (item) =>
          item.deleted === true
      ).length;

    const alreadyMissing =
      results.filter(
        (item) =>
          item.alreadyMissing === true
      ).length;

    const failed =
      results.filter(
        (item) =>
          item.success === false
      ).length;

    console.log("");
    console.log(
      "================================================="
    );

    console.log(
      "EXPIRED BIOMETRIC CLEANUP COMPLETED"
    );

    console.log(
      "Total:",
      results.length
    );

    console.log(
      "Deleted:",
      deleted
    );

    console.log(
      "Already Missing:",
      alreadyMissing
    );

    console.log(
      "Failed:",
      failed
    );

    console.log(
      "================================================="
    );

    return res.json({
      success: true,

      message:
        "Expired biometric member cleanup completed.",

      summary: {
        total:
          results.length,

        deleted,

        alreadyMissing,

        failed,
      },

      data:
        results,
    });

  } catch (error) {
    console.error(
      "Delete expired members error:",
      error
    );

    error.statusCode = 500;

    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| AUTOMATIC EXPIRED MEMBER CLEANUP
|--------------------------------------------------------------------------
|
| This function is called automatically from server.js.
|
| Unlike deleteExpiredMembers(), this function
| does not need Express req/res objects.
|
*/

async function cleanupExpiredMembersAutomatically() {
  console.log("");
  console.log(
    "================================================="
  );

  console.log(
    "AUTOMATIC EXPIRED BIOMETRIC CLEANUP STARTED"
  );

  console.log(
    "================================================="
  );

  const expiredMembers =
    await getExpiredMembers();

  console.log(
    "Expired members found:",
    expiredMembers.length
  );

  const results = [];

  for (
    const member
    of expiredMembers
  ) {
    try {
      const result =
        await processExpiredMember(
          member
        );

      results.push(
        result
      );

    } catch (error) {
      console.error(
        `Automatic deletion failed for ${member.full_name}:`,
        error.message
      );

      results.push({
        memberId:
          member.id,

        fullName:
          member.full_name,

        memberCode:
          member.member_code,

        biometricUserId:
          member.biometric_user_id,

        expiryDate:
          member.end_date,

        success: false,

        deleted: false,

        error:
          error.message,
      });
    }
  }

  const deleted =
    results.filter(
      (item) =>
        item.deleted === true
    ).length;

  const alreadyMissing =
    results.filter(
      (item) =>
        item.alreadyMissing === true
    ).length;

  const failed =
    results.filter(
      (item) =>
        item.success === false
    ).length;

  console.log("");
  console.log(
    "================================================="
  );

  console.log(
    "AUTOMATIC EXPIRED BIOMETRIC CLEANUP COMPLETED"
  );

  console.log(
    "Total:",
    results.length
  );

  console.log(
    "Deleted:",
    deleted
  );

  console.log(
    "Already Missing:",
    alreadyMissing
  );

  console.log(
    "Failed:",
    failed
  );

  console.log(
    "================================================="
  );

  return {
    total:
      results.length,

    deleted,

    alreadyMissing,

    failed,

    results,
  };
}

/*
|--------------------------------------------------------------------------
| ENROLL PLACEHOLDER
|--------------------------------------------------------------------------
*/

async function enrollBiometric(
  req,
  res
) {
  return res.status(501).json({
    success: false,

    message:
      "Biometric template enrollment is handled by the biometric machine.",
  });
}

/*
|--------------------------------------------------------------------------
| VERIFY PLACEHOLDER
|--------------------------------------------------------------------------
*/

async function verifyBiometric(
  req,
  res
) {
  return res.status(501).json({
    success: false,

    message:
      "Biometric verification is handled by the biometric machine.",
  });
}

/*
|--------------------------------------------------------------------------
| GET TEMPLATES
|--------------------------------------------------------------------------
*/

async function getTemplates(
  req,
  res
) {
  return res.json({
    success: true,
    data: [],
  });
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  getDeviceUsers,
  getDeviceStatus,
  testDevice,
  syncDevice,

  enrollBiometric,
  verifyBiometric,

  removeBiometric,

  deleteExpiredMembers,

  cleanupExpiredMembersAutomatically,

  getTemplates,
};
