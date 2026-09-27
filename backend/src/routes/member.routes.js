const express = require("express");

const router = express.Router();

const {
  body,
  param,
} = require("express-validator");

const memberController =
  require("../controllers/member.controller");

const {
  validate,
} = require("../middleware/validate");

const auth =
  require("../middleware/auth");

const admin =
  require("../middleware/admin");

const {
  uploadMemberPhoto,
} = require("../config/multer");

// ============================================================
// CREATE MEMBER VALIDATION
// ============================================================

const createMemberValidation = [

  // ==========================================================
  // PERSONAL DETAILS
  // ==========================================================

  body("fullName")
    .notEmpty()
    .withMessage(
      "Full name is required"
    ),

  body("email")
    .optional({
      checkFalsy: true,
    })
    .isEmail()
    .withMessage(
      "Valid email is required"
    ),

  body("phone")
    .optional({
      checkFalsy: true,
    })
    .isMobilePhone()
    .withMessage(
      "Valid phone number is required"
    ),

  body("dateOfBirth")
    .optional({
      checkFalsy: true,
    })
    .isDate()
    .withMessage(
      "Valid date of birth is required"
    ),

  body("gender")
    .optional({
      checkFalsy: true,
    })
    .isIn([
      "male",
      "female",
      "other",
    ])
    .withMessage(
      "Invalid gender"
    ),

  body("address")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid address is required"
    ),

  body("emergencyContactName")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid emergency contact name is required"
    ),

  body("emergencyContactPhone")
    .optional({
      checkFalsy: true,
    })
    .isMobilePhone()
    .withMessage(
      "Valid emergency phone is required"
    ),

  // ==========================================================
  // BIOMETRIC
  // ==========================================================

  body("biometricUserId")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid biometric user ID is required"
    ),

  // ==========================================================
  // EMPLOYEE CODE
  // ==========================================================

  body("memberCode")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid employee code is required"
    ),

  body("employeeCode")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid employee code is required"
    ),

  // ==========================================================
  // MEMBERSHIP PLAN
  // ==========================================================

  body("planId")
    .optional({
      checkFalsy: true,
    })
    .isUUID()
    .withMessage(
      "Invalid plan ID"
    ),

  // ==========================================================
  // MANUAL START DATE
  // ==========================================================

  body("startDate")
    .notEmpty()
    .withMessage(
      "Membership start date is required"
    )
    .isDate()
    .withMessage(
      "Valid membership start date is required"
    ),

  // ==========================================================
  // MANUAL EXPIRY DATE
  // ==========================================================

  body("expiryDate")
    .notEmpty()
    .withMessage(
      "Membership expiry date is required"
    )
    .isDate()
    .withMessage(
      "Valid membership expiry date is required"
    ),

  // ==========================================================
  // PAYMENT
  // ==========================================================

  body("amount")
    .optional({
      checkFalsy: true,
    })
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Amount must be a positive number"
    ),

  body("finalAmount")
    .optional({
      checkFalsy: true,
    })
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Final amount must be a positive number"
    ),

  body("baseAmount")
    .optional({
      checkFalsy: true,
    })
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Base amount must be a positive number"
    ),

  body("discount")
    .optional({
      checkFalsy: true,
    })
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Discount must be a positive number"
    ),

  body("paymentMethod")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid payment method is required"
    ),
];

// ============================================================
// UPDATE MEMBER VALIDATION
// ============================================================

const updateMemberValidation = [

  param("id")
    .isUUID()
    .withMessage(
      "Invalid member ID"
    ),

  body("fullName")
    .optional()
    .notEmpty()
    .withMessage(
      "Full name cannot be empty"
    ),

  body("email")
    .optional({
      checkFalsy: true,
    })
    .isEmail()
    .withMessage(
      "Valid email is required"
    ),

  body("phone")
    .optional({
      checkFalsy: true,
    })
    .isMobilePhone()
    .withMessage(
      "Valid phone number is required"
    ),

  body("dateOfBirth")
    .optional({
      checkFalsy: true,
    })
    .isDate()
    .withMessage(
      "Valid date of birth is required"
    ),

  body("gender")
    .optional({
      checkFalsy: true,
    })
    .isIn([
      "male",
      "female",
      "other",
    ])
    .withMessage(
      "Invalid gender"
    ),

  body("employeeCode")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid employee code is required"
    ),

  body("memberCode")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid member code is required"
    ),

  body("biometricUserId")
    .optional({
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Valid biometric user ID is required"
    ),

  body("startDate")
    .optional({
      checkFalsy: true,
    })
    .isDate()
    .withMessage(
      "Valid membership start date is required"
    ),

  body("expiryDate")
    .optional({
      checkFalsy: true,
    })
    .isDate()
    .withMessage(
      "Valid membership expiry date is required"
    ),
];

// ============================================================
// GET ALL MEMBERS
// ============================================================

router.get(
  "/",
  auth,
  memberController.getAllMembers
);

// ============================================================
// SEARCH MEMBERS
// ============================================================

router.get(
  "/search",
  auth,
  memberController.searchMembers
);

// ============================================================
// ENROLL MEMBER
// ============================================================

router.post(
  "/enroll",
  auth,
  admin,
  createMemberValidation,
  validate,
  memberController.enrollMember
);

// ============================================================
// NORMAL CREATE MEMBER
// ============================================================

router.post(
  "/",
  auth,
  admin,
  createMemberValidation,
  validate,
  memberController.createMember
);

// ============================================================
// GET MEMBER BY UUID
// ============================================================

router.get(
  "/:id",
  auth,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  validate,
  memberController.getMemberById
);

// ============================================================
// UPDATE MEMBER
// ============================================================

router.put(
  "/:id",
  auth,
  admin,
  updateMemberValidation,
  validate,
  memberController.updateMember
);

// ============================================================
// DELETE MEMBER
// ============================================================

router.delete(
  "/:id",
  auth,
  admin,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  validate,
  memberController.deleteMember
);

// ============================================================
// MEMBER PHOTO
// ============================================================

router.post(
  "/:id/photo",
  auth,
  admin,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  uploadMemberPhoto.single(
    "photo"
  ),
  memberController.uploadPhoto
);

// ============================================================
// MEMBER MEMBERSHIPS
// ============================================================

router.get(
  "/:id/memberships",
  auth,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  validate,
  memberController.getMemberMemberships
);

// ============================================================
// MEMBER PAYMENTS
// ============================================================

router.get(
  "/:id/payments",
  auth,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  validate,
  memberController.getMemberPayments
);

// ============================================================
// MEMBER ATTENDANCE
// ============================================================

router.get(
  "/:id/attendance",
  auth,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid member ID"
      ),
  ],
  validate,
  memberController.getMemberAttendance
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;