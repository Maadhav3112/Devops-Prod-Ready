const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
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

// GET /api/departments — list the managed department names
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: departments.length, data: departments });
  })
);

// POST /api/departments/sync — one-time convenience: pulls distinct
// department names already used on existing employees into the managed
// list, so V1/pre-existing data doesn't need to be retyped by hand.
router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const distinctValues = await Employee.distinct('department');
    const existing = await Department.find({}, 'name');
    const existingNames = new Set(existing.map((d) => d.name.toLowerCase()));
    const toInsert = distinctValues
      .filter(Boolean)
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({ name: name.trim() }));

    if (toInsert.length > 0) {
      await Department.insertMany(toInsert, { ordered: false });
    }

    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json({ success: true, added: toInsert.length, data: departments });
  })
);

// POST /api/departments — add a department to the managed list
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Department name is required')],
  checkValidation,
  asyncHandler(async (req, res) => {
    const name = req.body.name.trim();
    const existing = await Department.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (existing) throw new AppError('That department already exists', 409);

    const department = await Department.create({ name });
    logger.info('Department created', { id: department._id.toString(), name });
    res.status(201).json({ success: true, data: department });
  })
);

// DELETE /api/departments/:id — remove from the managed list only.
// Existing employees keep whatever department name they already have;
// the response tells the caller how many records still reference it.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id);
    if (!department) throw new AppError('Department not found', 404);

    const employeesStillUsingName = await Employee.countDocuments({ department: department.name });
    await Department.findByIdAndDelete(req.params.id);
    logger.info('Department removed from managed list', { id: req.params.id, employeesStillUsingName });

    res.status(200).json({ success: true, data: { employeesStillUsingName } });
  })
);

module.exports = router;
