const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const config = require('../config');
const authenticate = require('../middleware/auth');
const { signupValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator } = require('../validators/auth');
const { success, created, error } = require('../utils/apiResponse');

const router = express.Router();

// ─── POST /api/auth/signup ───────────────────────────────────────────────────

router.post('/signup', signupValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array(),
      });
    }

    const prisma = req.app.locals.prisma;
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return error(res, 'An account with this email already exists.', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return created(res, { user, token }, 'Account created successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────

router.post('/login', loginValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array(),
      });
    }

    const prisma = req.app.locals.prisma;
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return error(res, 'Invalid email or password.', 401);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return error(res, 'Invalid email or password.', 401);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return success(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    }, 'Login successful.');
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return error(res, 'User not found.', 404);
    }

    return success(res, user);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────

router.post('/forgot-password', forgotPasswordValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array(),
      });
    }

    const prisma = req.app.locals.prisma;
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return error(res, 'No account found with that email address.', 404);
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // In a real app, you would send an email here.
    // For this assignment, we return the token directly so the frontend can demo the flow.
    return success(res, { resetToken }, 'Password reset token generated. In production, this would be emailed to you.');
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────────────────────

router.post('/reset-password', resetPasswordValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array(),
      });
    }

    const prisma = req.app.locals.prisma;
    const { token, password } = req.body;

    // Find user by token and check expiry
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return error(res, 'Invalid or expired reset token.', 400);
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

    // Update password and clear reset fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return success(res, null, 'Password has been reset successfully. You can now log in with your new password.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
