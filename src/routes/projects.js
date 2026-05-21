const express = require('express');
const { validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/projectRole');
const { createProjectValidator, updateProjectValidator } = require('../validators/projects');
const { success, created, error } = require('../utils/apiResponse');

const router = express.Router();

// ─── POST /api/projects — Create a new project ──────────────────────────────

router.post('/', authenticate, createProjectValidator, async (req, res, next) => {
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
    const { name, description } = req.body;

    // Create project and add creator as ADMIN in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          name,
          description,
          createdById: req.user.id,
        },
      });

      // Auto-add creator as ADMIN member
      await tx.projectMember.create({
        data: {
          projectId: proj.id,
          userId: req.user.id,
          role: 'ADMIN',
        },
      });

      return proj;
    });

    // Fetch full project with member count
    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, tasks: true } },
      },
    });

    return created(res, fullProject, 'Project created successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/projects — List user's projects ───────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId: req.user.id },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, tasks: true } },
        members: {
          where: { userId: req.user.id },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Flatten the member role
    const result = projects.map((p) => ({
      ...p,
      myRole: p.members[0]?.role || null,
      members: undefined,
    }));

    return success(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/projects/:id — Get project details ────────────────────────────

router.get('/:id', authenticate, requireProjectMember(), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
    });

    return success(res, {
      ...project,
      myRole: req.projectMembership.role,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/projects/:id — Update project (Admin only) ────────────────────

router.put('/:id', authenticate, requireProjectMember('ADMIN'), updateProjectValidator, async (req, res, next) => {
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
    const { name, description } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, tasks: true } },
      },
    });

    return success(res, project, 'Project updated successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/projects/:id — Delete project (Admin only) ──────────────────

router.delete('/:id', authenticate, requireProjectMember('ADMIN'), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    return success(res, null, 'Project deleted successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
