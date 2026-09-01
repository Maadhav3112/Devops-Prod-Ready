const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Role = require('../models/Role');
const Employee = require('../models/Employee');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/roles — list the managed role names
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const roles = await Role.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: roles.length, data: roles });
  })
);

// POST /api/roles/sync — pulls distinct role names already used on
// existing employees into the managed list.
router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const distinctValues = await Employee.distinct('role');
    const existing = await Role.find({}, 'name');
    const existingNames = new Set(existing.map((r) => r.name.toLowerCase()));
    const toInsert = distinctValues
      .filter(Boolean)
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({ name: name.trim() }));

    if (toInsert.length > 0) {
      await Role.insertMany(toInsert, { ordered: false });
    }

    const roles = await Role.find().sort({ name: 1 });
    res.status(200).json({ success: true, added: toInsert.length, data: roles });
  })
);

// POST /api/roles — add a role to the managed list
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Role name is required')],
  checkValidation,
  asyncHandler(async (req, res) => {
    const name = req.body.name.trim();
    const existing = await Role.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (existing) throw new AppError('That role already exists', 409);

    const role = await Role.create({ name });
    logger.info('Role created', { id: role._id.toString(), name });
    res.status(201).json({ success: true, data: role });
  })
);

// DELETE /api/roles/:id — remove from the managed list only.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) throw new AppError('Role not found', 404);

    const employeesStillUsingName = await Employee.countDocuments({ role: role.name });
    await Role.findByIdAndDelete(req.params.id);
    logger.info('Role removed from managed list', { id: req.params.id, employeesStillUsingName });

    res.status(200).json({ success: true, data: { employeesStillUsingName } });
  })
);

module.exports = router;
