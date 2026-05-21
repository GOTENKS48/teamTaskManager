const express = require('express');
const { validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const { requireProjectMember } = require('../middleware/projectRole');
const { createTaskValidator, updateTaskValidator } = require('../validators/tasks');
const { success, created, error } = require('../utils/apiResponse');

const router = express.Router({ mergeParams: true });

// ─── POST /api/projects/:id/tasks — Create task (Admin only) ─────────────────

router.post('/', authenticate, requireProjectMember('ADMIN'), createTaskValidator, async (req, res, next) => {
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
    const { title, description, status, priority, dueDate, assigneeIds } = req.body;

    // If assigning, verify all assignees are project members
    if (assigneeIds && assigneeIds.length > 0) {
      const members = await prisma.projectMember.findMany({
        where: {
          projectId,
          userId: { in: assigneeIds },
        },
      });

      if (members.length !== assigneeIds.length) {
        return error(res, 'One or more assigned users are not members of this project.', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assignees: assigneeIds && assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
        createdById: req.user.id,
      },
      include: {
        assignees: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return created(res, task, 'Task created successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/projects/:id/tasks — List tasks (with filters) ────────────────

router.get('/', authenticate, requireProjectMember(), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const projectId = req.params.id;
    const { status, priority, assignedTo, sortBy, order } = req.query;

    // Build filter
    const where = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) {
      where.assignees = {
        some: { id: assignedTo },
      };
    }

    // Build sort
    const orderBy = {};
    const sortField = sortBy || 'createdAt';
    const sortOrder = order || 'desc';

    if (['createdAt', 'dueDate', 'priority', 'status', 'title'].includes(sortField)) {
      orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignees: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy,
    });

    return success(res, tasks);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/projects/:id/tasks/:taskId — Get single task ──────────────────

router.get('/:taskId', authenticate, requireProjectMember(), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        projectId: req.params.id,
      },
      include: {
        assignees: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return error(res, 'Task not found.', 404);
    }

    return success(res, task);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/projects/:id/tasks/:taskId — Update task ──────────────────────

router.put('/:taskId', authenticate, requireProjectMember(), updateTaskValidator, async (req, res, next) => {
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
    const { taskId } = req.params;
    const projectId = req.params.id;
    const membership = req.projectMembership;

    // Find the task
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: { assignees: true },
    });

    if (!task) {
      return error(res, 'Task not found.', 404);
    }

    const { title, description, status, priority, dueDate, assigneeIds } = req.body;

    // Members can only update status of tasks assigned to them
    if (membership.role === 'MEMBER') {
      const isAssignedToMe = task.assignees.some(user => user.id === req.user.id);

      if (!isAssignedToMe) {
        return error(res, 'Members can only update tasks assigned to them.', 403);
      }

      // Members can only change status
      if (title || description || priority || dueDate !== undefined || assigneeIds !== undefined) {
        return error(res, 'Members can only update task status.', 403);
      }
    }

    // If re-assigning, verify assignees are project members
    if (assigneeIds && assigneeIds.length > 0) {
      const members = await prisma.projectMember.findMany({
        where: {
          projectId,
          userId: { in: assigneeIds },
        },
      });

      if (members.length !== assigneeIds.length) {
        return error(res, 'One or more assigned users are not members of this project.', 400);
      }
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeIds !== undefined) {
      updateData.assignees = {
        set: assigneeIds ? assigneeIds.map(id => ({ id })) : [],
      };
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignees: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return success(res, updatedTask, 'Task updated successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/projects/:id/tasks/:taskId — Delete task (Admin only) ───────

router.delete('/:taskId', authenticate, requireProjectMember('ADMIN'), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const task = await prisma.task.findFirst({
      where: {
        id: req.params.taskId,
        projectId: req.params.id,
      },
    });

    if (!task) {
      return error(res, 'Task not found.', 404);
    }

    await prisma.task.delete({
      where: { id: req.params.taskId },
    });

    return success(res, null, 'Task deleted successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
