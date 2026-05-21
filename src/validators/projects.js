const { body } = require('express-validator');

const createProjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required.')
    .isLength({ min: 1, max: 200 })
    .withMessage('Project name must be between 1 and 200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters.'),
];

const updateProjectValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty.')
    .isLength({ min: 1, max: 200 })
    .withMessage('Project name must be between 1 and 200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters.'),
];

const addMemberValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Member email is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Role must be either ADMIN or MEMBER.'),
];

const updateMemberRoleValidator = [
  body('role')
    .notEmpty()
    .withMessage('Role is required.')
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Role must be either ADMIN or MEMBER.'),
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  addMemberValidator,
  updateMemberRoleValidator,
};
