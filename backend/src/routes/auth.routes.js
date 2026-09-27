const express = require('express');
const { body, validationResult } = require('express-validator');
const { authClient } = require('../config/supabase');
const auth = require('../middleware/auth');

const router = express.Router();
const validate = (req, res, next) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? next() : res.status(422).json({ success: false, errors: errors.array() });
};

router.post('/login', [body('email').isEmail(), body('password').isString().notEmpty()], validate, async (req, res, next) => {
  try {
    if (req.body.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const { data, error } = await authClient.auth.signInWithPassword(req.body);
    if (error || !data.session) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    res.json({ success: true, data: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at, user: { id: data.user.id, email: data.user.email } } });
  } catch (error) { next(error); }
});
router.post("/refresh", async (req, res) => {
  try {

    const { refreshToken } = req.body;

    const { data, error } =
      await authClient.auth.refreshSession({
        refresh_token: refreshToken,
      });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: "Refresh failed",
      });
    }

    res.json({
      success: true,
      data: {
        accessToken:
          data.session.access_token,

        refreshToken:
          data.session.refresh_token,

        expiresAt:
          data.session.expires_at,
      },
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/me', auth, (req, res) => res.json({ success: true, data: { id: req.user.id, email: req.user.email } }));

router.post('/forgot-password', [body('email').isEmail()], validate, async (req, res, next) => {
  try {
    if (req.body.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
      await authClient.auth.resetPasswordForEmail(req.body.email, { redirectTo: `${process.env.FRONTEND_ORIGIN}/reset-password` });
    }
    res.json({ success: true, message: 'If the account exists, a reset link has been sent.' });
  } catch (error) { next(error); }
});

module.exports = router;
