const express = require('express');
const authenticate = require('../middleware/auth');
const { success } = require('../utils/apiResponse');

const router = express.Router();

// ─── GET /api/dashboard — Aggregated stats for current user ──────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    // Get all projects where user is a member
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = memberships.map((m) => m.projectId);

    // Task counts by status (across all user's projects)
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });

    // My tasks by status (assigned to me)
    const myTasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: {
        assignees: { some: { id: userId } },
        projectId: { in: projectIds },
      },
      _count: { id: true },
    });

    // Overdue tasks (due date in the past, not DONE)
    const overdueTasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: new Date() },
        status: { not: 'DONE' },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignees: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // Recent tasks (last 10 updated)
    const recentTasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true } },
        assignees: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Project count
    const projectCount = projectIds.length;

    // Total members across all projects
    const totalMembers = await prisma.projectMember.count({
      where: { projectId: { in: projectIds } },
    });

    // Format status counts into an object
    const formatStatusCounts = (groups) => {
      const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
      groups.forEach((g) => {
        counts[g.status] = g._count.id;
      });
      counts.total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
      return counts;
    };

    return success(res, {
      projects: projectCount,
      totalMembers,
      allTasks: formatStatusCounts(tasksByStatus),
      myTasks: formatStatusCounts(myTasksByStatus),
      overdueTasks,
      recentTasks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
