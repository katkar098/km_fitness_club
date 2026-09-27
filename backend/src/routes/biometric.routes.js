const express = require("express");
const { body, param } = require("express-validator");

const router = express.Router();

const biometricController =
  require("../controllers/biometric.controller");

const { validate } =
  require("../middleware/validate");

const auth =
  require("../middleware/auth");

const admin =
  require("../middleware/admin");

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
|
| All biometric routes require login.
|
*/

router.use(auth);

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| ENROLL VALIDATION
|--------------------------------------------------------------------------
*/

const enrollValidation = [
  body("memberId")
    .isUUID()
    .withMessage("Invalid member ID"),

  body("biometricType")
    .isIn([
      "fingerprint",
      "face",
    ])
    .withMessage(
      "Invalid biometric type"
    ),
];

/*
|--------------------------------------------------------------------------
| VERIFY VALIDATION
|--------------------------------------------------------------------------
*/

const verifyValidation = [
  body("biometricType")
    .isIn([
      "fingerprint",
      "face",
    ])
    .withMessage(
      "Invalid biometric type"
    ),
];

/*
|--------------------------------------------------------------------------
| EXPIRED MEMBER CLEANUP
|--------------------------------------------------------------------------
|
| POST
|
| /api/biometric/delete-expired
|
| This checks the latest membership for every member.
|
| Expiry date source:
|
| memberships.end_date
|
| A member is expired only when:
|
| memberships.end_date < CURRENT_DATE
|
| Example:
|
| End Date = 23-08-2026
|
| Member can access gym on 23-08-2026.
|
| On 24-08-2026 the cleanup will delete the user
| from the biometric machine.
|
| IMPORTANT:
|
| This route MUST come before:
|
| DELETE /:memberId
|
*/

router.post(
  "/delete-expired",
  admin,
  biometricController.deleteExpiredMembers
);

/*
|--------------------------------------------------------------------------
| BIOMETRIC ENROLL
|--------------------------------------------------------------------------
|
| POST
|
| /api/biometric/enroll
|
*/

router.post(
  "/enroll",
  admin,
  enrollValidation,
  validate,
  biometricController.enrollBiometric
);

/*
|--------------------------------------------------------------------------
| BIOMETRIC VERIFY
|--------------------------------------------------------------------------
|
| POST
|
| /api/biometric/verify
|
*/

router.post(
  "/verify",
  verifyValidation,
  validate,
  biometricController.verifyBiometric
);

/*
|--------------------------------------------------------------------------
| DEVICE STATUS
|--------------------------------------------------------------------------
|
| GET
|
| /api/biometric/device/status
|
*/

router.get(
  "/device/status",
  admin,
  biometricController.getDeviceStatus
);

/*
|--------------------------------------------------------------------------
| DEVICE USERS
|--------------------------------------------------------------------------
|
| GET
|
| /api/biometric/device/users
|
|
| Returns biometric users currently available on
| the biometric machine.
|
*/

router.get(
  "/device/users",
  admin,
  biometricController.getDeviceUsers
);

/*
|--------------------------------------------------------------------------
| DEVICE SYNC
|--------------------------------------------------------------------------
|
| POST
|
| /api/biometric/device/sync
|
*/

router.post(
  "/device/sync",
  admin,
  biometricController.syncDevice
);

/*
|--------------------------------------------------------------------------
| DEVICE TEST
|--------------------------------------------------------------------------
|
| GET
|
| /api/biometric/device/test
|
*/

router.get(
  "/device/test",
  admin,
  biometricController.testDevice
);

/*
|--------------------------------------------------------------------------
| BIOMETRIC TEMPLATES
|--------------------------------------------------------------------------
|
| GET
|
| /api/biometric/templates
|
*/

router.get(
  "/templates",
  admin,
  biometricController.getTemplates
);

/*
|--------------------------------------------------------------------------
| DELETE SINGLE BIOMETRIC MEMBER
|--------------------------------------------------------------------------
|
| DELETE
|
| /api/biometric/:memberId
|
| Example:
|
| DELETE /api/biometric/
| 550e8400-e29b-41d4-a716-446655440000
|
| This:
|
| 1. Finds member in PostgreSQL.
| 2. Gets biometric_user_id.
| 3. Deletes that user from biometric machine.
|
*/

router.delete(
  "/:memberId",
  admin,
  [
    param("memberId")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  validate,
  biometricController.removeBiometric
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = router;