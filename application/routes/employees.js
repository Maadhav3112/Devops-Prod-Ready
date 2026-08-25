const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// Reusable validation rules
const employeeValidationRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
];

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

// POST /api/employees — Create
router.post(
  '/',
  employeeValidationRules,
  checkValidation,
  asyncHandler(async (req, res) => {
    const { name, email, department, role, salary } = req.body;
    const employee = await Employee.create({ name, email, department, role, salary });
    logger.info('Employee created', { id: employee._id.toString() });
    res.status(201).json({ success: true, data: employee });
  })
);

// GET /api/employees — List all
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: employees.length, data: employees });
  })
);

// GET /api/employees/:id — Get one
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw new AppError('Employee not found', 404);
    res.status(200).json({ success: true, data: employee });
  })
);

// PUT /api/employees/:id — Update
router.put(
  '/:id',
  employeeValidationRules,
  checkValidation,
  asyncHandler(async (req, res) => {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!employee) throw new AppError('Employee not found', 404);
    logger.info('Employee updated', { id: employee._id.toString() });
    res.status(200).json({ success: true, data: employee });
  })
);

// DELETE /api/employees/:id — Delete
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) throw new AppError('Employee not found', 404);
    logger.info('Employee deleted', { id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  })
);

module.exports = router;