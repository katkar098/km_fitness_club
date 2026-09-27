const { supabaseAdmin } = require("../config/supabase");

module.exports = async (req, res, next) => {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");

    console.log("\n========== AUTH ==========");
    console.log("Authorization:", req.get("authorization"));
    console.log("Token:", token?.substring(0, 40));

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    console.log("Data:", data);
    console.log("Error:", error);
    console.log("==========================\n");

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
        error
      });
    }

    if (
      data.user.email?.toLowerCase() !==
      process.env.ADMIN_EMAIL?.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "Administrator access required"
      });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error(err);
    next(err);
  }
};