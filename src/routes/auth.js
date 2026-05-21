const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const config = require('../config');
const authenticate = require('../middleware/auth');
const { signupValidator, loginValidator } = require('../validators/auth');
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

module.exports = router;
