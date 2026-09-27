const admin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isConfiguredAdmin = Boolean(configuredAdminEmail && req.user.email) &&
      req.user.email.toLowerCase() === configuredAdminEmail;
    if (!isConfiguredAdmin && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
};

module.exports = admin;
