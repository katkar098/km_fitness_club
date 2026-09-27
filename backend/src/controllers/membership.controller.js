const membershipService =
  require("../services/membership.service");

// ============================================================
// PLANS
// ============================================================

async function getAllPlans(
  req,
  res
) {
  try {
    const plans =
      await membershipService.getAllPlans();

    return res.json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getPlanById(
  req,
  res
) {
  try {
    const plan =
      await membershipService.getPlanById(
        req.params.id
      );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function createPlan(
  req,
  res
) {
  try {
    const plan =
      await membershipService.createPlan(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Membership plan created successfully",
      data: plan,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function updatePlan(
  req,
  res
) {
  try {
    const plan =
      await membershipService.updatePlan(
        req.params.id,
        req.body
      );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Membership plan updated successfully",
      data: plan,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function deletePlan(
  req,
  res
) {
  try {
    const plan =
      await membershipService.deletePlan(
        req.params.id
      );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Membership plan deleted successfully",
      data: plan,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// MEMBERSHIPS
// ============================================================

async function getAllMemberships(
  req,
  res
) {
  try {
    const memberships =
      await membershipService.getAllMemberships();

    return res.json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getMembershipById(
  req,
  res
) {
  try {
    const membership =
      await membershipService.getMembershipById(
        req.params.id
      );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    return res.json({
      success: true,
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// ASSIGN
// ============================================================

async function assignMembership(
  req,
  res
) {
  try {
    const {
      startDate,
      endDate,
    } = req.body;

    if (
      new Date(endDate) <
      new Date(startDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiry date cannot be before start date.",
      });
    }

    const membership =
      await membershipService.assignMembership(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Membership assigned successfully",
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// UPDATE
// ============================================================

async function updateMembership(
  req,
  res
) {
  try {
    const {
      startDate,
      endDate,
    } = req.body;

    if (
      startDate &&
      endDate &&
      new Date(endDate) <
        new Date(startDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiry date cannot be before start date.",
      });
    }

    const membership =
      await membershipService.updateMembership(
        req.params.id,
        req.body
      );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Membership updated successfully",
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// RENEW
// ============================================================

async function renewMembership(
  req,
  res
) {
  try {
    const {
      startDate,
      expiryDate,
    } = req.body;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Renewal start date is required.",
      });
    }

    if (!expiryDate) {
      return res.status(400).json({
        success: false,
        message:
          "Renewal expiry date is required.",
      });
    }

    if (
      new Date(expiryDate) <
      new Date(startDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Renewal expiry date cannot be before renewal start date.",
      });
    }

    const membership =
      await membershipService.renewMembership(
        req.params.id,
        req.body
      );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Membership renewed successfully",

      data: {
        membership,
        startDate:
          membership.start_date,

        expiryDate:
          membership.end_date,
      },
    });
  } catch (error) {
    console.error(
      "renewMembership error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// CANCEL
// ============================================================

async function cancelMembership(
  req,
  res
) {
  try {
    const membership =
      await membershipService.cancelMembership(
        req.params.id
      );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message:
          "Membership not found",
      });
    }

    return res.json({
      success: true,
      message:
        "Membership cancelled successfully",
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// EXPIRING
// ============================================================

async function getExpiringMemberships(
  req,
  res
) {
  try {
    const memberships =
      await membershipService.getExpiringMemberships();

    return res.json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ============================================================
// EXPIRED
// ============================================================

async function getExpiredMemberships(
  req,
  res
) {
  try {
    const memberships =
      await membershipService.getExpiredMemberships();

    return res.json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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