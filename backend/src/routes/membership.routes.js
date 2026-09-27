const express = require("express");

const router = express.Router();

const {
  body,
  param,
} = require("express-validator");

const membershipController =
  require("../controllers/membership.controller");

const { validate } =
  require("../middleware/validate");

const auth =
  require("../middleware/auth");

const admin =
  require("../middleware/admin");

// ============================================================
// PLAN VALIDATION
// ============================================================

const createPlanValidation = [
  body("name")
    .notEmpty()
    .withMessage("Plan name is required"),

  body("durationMonths")
    .isInt({ min: 1 })
    .withMessage(
      "Duration must be at least 1 month"
    ),

  body("price")
    .isFloat({ min: 0 })
    .withMessage(
      "Price must be a positive number"
    ),

  body("description")
    .optional()
    .isString()
    .withMessage(
      "Valid description is required"
    ),

  body("features")
    .optional()
    .isObject()
    .withMessage(
      "Features must be an object"
    ),
];

const updatePlanValidation = [
  param("id")
    .isUUID()
    .withMessage("Invalid plan ID"),

  body("name")
    .optional()
    .notEmpty()
    .withMessage(
      "Plan name cannot be empty"
    ),

  body("durationMonths")
    .optional()
    .isInt({ min: 1 })
    .withMessage(
      "Duration must be at least 1 month"
    ),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Price must be a positive number"
    ),
];

// ============================================================
// ASSIGN MEMBERSHIP
// ============================================================

const assignMembershipValidation = [
  body("memberId")
    .isUUID()
    .withMessage("Invalid member ID"),

  body("planId")
    .isUUID()
    .withMessage("Invalid plan ID"),

  body("startDate")
    .isDate()
    .withMessage(
      "Valid start date is required"
    ),

  body("endDate")
    .isDate()
    .withMessage(
      "Valid end date is required"
    ),
];

// ============================================================
// RENEW VALIDATION
// ============================================================

const renewMembershipValidation = [
  param("id")
    .isUUID()
    .withMessage(
      "Invalid membership ID"
    ),

  body("startDate")
    .isDate()
    .withMessage(
      "Valid renewal start date is required"
    ),

  body("expiryDate")
    .isDate()
    .withMessage(
      "Valid renewal expiry date is required"
    ),

  body("planId")
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage(
      "Invalid plan ID"
    ),

  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Invalid amount"
    ),

  body("paymentMethod")
    .optional()
    .isString()
    .withMessage(
      "Invalid payment method"
    ),
];

// ============================================================
// PLANS
// ============================================================

router.get(
  "/plans",
  auth,
  membershipController.getAllPlans
);

router.get(
  "/plans/:id",
  auth,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid plan ID"
      ),
  ],
  validate,
  membershipController.getPlanById
);

router.post(
  "/plans",
  auth,
  admin,
  createPlanValidation,
  validate,
  membershipController.createPlan
);

router.put(
  "/plans/:id",
  auth,
  admin,
  updatePlanValidation,
  validate,
  membershipController.updatePlan
);

router.delete(
  "/plans/:id",
  auth,
  admin,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid plan ID"
      ),
  ],
  validate,
  membershipController.deletePlan
);

// ============================================================
// MEMBERSHIPS
// ============================================================

router.get(
  "/",
  auth,
  membershipController.getAllMemberships
);

router.get(
  "/expiring",
  auth,
  membershipController.getExpiringMemberships
);

router.get(
  "/expired",
  auth,
  membershipController.getExpiredMemberships
);

router.get(
  "/:id",
  auth,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid membership ID"
      ),
  ],
  validate,
  membershipController.getMembershipById
);

router.post(
  "/",
  auth,
  admin,
  assignMembershipValidation,
  validate,
  membershipController.assignMembership
);

router.put(
  "/:id",
  auth,
  admin,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid membership ID"
      ),

    body("status")
      .optional()
      .isIn([
        "active",
        "expired",
        "cancelled",
      ])
      .withMessage(
        "Invalid status"
      ),

    body("endDate")
      .optional()
      .isDate()
      .withMessage(
        "Valid end date is required"
      ),
  ],
  validate,
  membershipController.updateMembership
);

// ============================================================
// RENEW
// ============================================================

router.post(
  "/:id/renew",
  auth,
  admin,
  renewMembershipValidation,
  validate,
  membershipController.renewMembership
);

// ============================================================
// CANCEL
// ============================================================

router.post(
  "/:id/cancel",
  auth,
  admin,
  [
    param("id")
      .isUUID()
      .withMessage(
        "Invalid membership ID"
      ),
  ],
  validate,
  membershipController.cancelMembership
);

module.exports = router;