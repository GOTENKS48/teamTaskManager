const express = require('express');
const { validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/projectRole');
const { addMemberValidator, updateMemberRoleValidator } = require('../validators/projects');
const { success, created, error } = require('../utils/apiResponse');

const router = express.Router({ mergeParams: true }); // access :id from parent router

// ─── POST /api/projects/:id/members — Add member (Admin only) ────────────────

router.post('/', authenticate, requireProjectMember('ADMIN'), addMemberValidator, async (req, res, next) => {
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
    const projectId = req.params.id;
    const { email, role } = req.body;

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!userToAdd) {
      return error(res, 'No user found with this email address.', 404);
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return error(res, 'This user is already a member of the project.', 409);
    }

    // Add member
    const membership = await prisma.projectMember.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role: role || 'MEMBER',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return created(res, membership, 'Member added successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/projects/:id/members — List members ───────────────────────────

router.get('/', authenticate, requireProjectMember(), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return success(res, members);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/projects/:id/members/:userId — Update member role (Admin) ─────

router.put('/:userId', authenticate, requireProjectMember('ADMIN'), updateMemberRoleValidator, async (req, res, next) => {
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
    const projectId = req.params.id;
    const userId = req.params.userId;
    const { role } = req.body;

    // Prevent demoting yourself if you're the only admin
    if (userId === req.user.id && role === 'MEMBER') {
      const adminCount = await prisma.projectMember.count({
        where: { projectId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        return error(res, 'Cannot demote yourself. You are the only admin.', 400);
      }
    }

    const membership = await prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId },
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return success(res, membership, 'Member role updated successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/projects/:id/members/:userId — Remove member (Admin) ────────

router.delete('/:userId', authenticate, requireProjectMember('ADMIN'), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const projectId = req.params.id;
    const userId = req.params.userId;

    // Prevent removing yourself if you're the only admin
    if (userId === req.user.id) {
      const adminCount = await prisma.projectMember.count({
        where: { projectId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        return error(res, 'Cannot remove yourself. You are the only admin.', 400);
      }
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    return success(res, null, 'Member removed successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
