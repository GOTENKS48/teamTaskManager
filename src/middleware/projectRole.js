/**
 * Project Role Authorization Middleware
 * Checks if the current user is a member of the project
 * and optionally enforces a required role (ADMIN).
 *
 * Usage:
 *   requireProjectMember()          — any project member
 *   requireProjectMember('ADMIN')   — admin only
 */
function requireProjectMember(requiredRole) {
  return async (req, res, next) => {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const projectId = req.params.id || req.params.projectId;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required.',
      });
    }

    try {
      // Check if the project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.',
        });
      }

      // Check membership
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this project.',
        });
      }

      // Check role if required
      if (requiredRole && membership.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: `This action requires ${requiredRole} role.`,
        });
      }

      // Attach membership info to request for downstream use
      req.projectMembership = membership;
      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requireProjectMember };
