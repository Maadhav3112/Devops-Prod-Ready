const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const VALID_STATUSES = ['Active', 'On Leave', 'Inactive'];

// Reusable validation rules
const employeeValidationRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  // V2: status is optional so existing V1 API clients that never send it keep working.
  body('status')
    .optional()
    .trim()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

// V2: validation for the new list query params. All optional and additive —
// a request with none of these behaves exactly like the V1 endpoint.
const listQueryValidationRules = [
  query('department').optional().trim(),
  query('role').optional().trim(),
  query('status').optional().trim().isIn(VALID_STATUSES).withMessage(`Status filter must be one of: ${VALID_STATUSES.join(', ')}`),
  query('search').optional().trim(),
];

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
}

// Normalizes a raw employee document so documents created under V1
// (which have no `status` field at all in the database) still present
// a sensible status to V2 clients, without requiring a migration.
function normalizeStatus(employeeDoc) {
  const obj = employeeDoc.toObject ? employeeDoc.toObject() : employeeDoc;
  if (!obj.status) {
    obj.status = 'Active';
  }
  return obj;
}

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// POST /api/employees — Create
router.post(
  '/',
  employeeValidationRules,
  checkValidation,
  asyncHandler(async (req, res) => {
    const { name, email, department, role, salary, status } = req.body;
    const employee = await Employee.create({ name, email, department, role, salary, status });
    logger.info('Employee created', { id: employee._id.toString() });
    res.status(201).json({ success: true, data: normalizeStatus(employee) });
  })
);

// GET /api/employees — List all, with optional filtering + search (V2, additive)
// Supported query params (all optional, all backward-compatible):
//   ?search=term        matches name, department, or role (case-insensitive)
//   ?department=Sales   exact department filter
//   ?role=Manager       exact role filter
//   ?status=Active      status filter
// Calling GET /api/employees with no params returns everything, same as V1.
router.get(
  '/',
  listQueryValidationRules,
  checkValidation,
  asyncHandler(async (req, res) => {
    const { department, role, status, search } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { department: regex }, { role: regex }];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    const data = employees.map(normalizeStatus);
    res.status(200).json({ success: true, count: data.length, data });
  })
);

// GET /api/employees/stats — Dashboard + salary analytics (V2, new)
// Placed before /:id so the literal path "stats" isn't swallowed by that route.
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const employees = await Employee.find();

    if (employees.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalEmployees: 0,
          totalDepartments: 0,
          averageSalary: 0,
          highestSalary: 0,
          lowestSalary: 0,
          byDepartment: [],
        },
      });
    }

    const salaries = employees.map((e) => e.salary || 0);
    const departments = new Set(employees.map((e) => e.department).filter(Boolean));

    const totalSalary = salaries.reduce((sum, s) => sum + s, 0);
    const averageSalary = totalSalary / salaries.length;
    const highestSalary = Math.max(...salaries);
    const lowestSalary = Math.min(...salaries);

    // Salary summary grouped by department
    const deptMap = {};
    for (const emp of employees) {
      const dept = emp.department || 'Unassigned';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, count: 0, totalSalary: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].totalSalary += emp.salary || 0;
    }
    const byDepartment = Object.values(deptMap).map((d) => ({
      department: d.department,
      count: d.count,
      averageSalary: Math.round(d.totalSalary / d.count),
      totalSalary: d.totalSalary,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: employees.length,
        totalDepartments: departments.size,
        averageSalary: Math.round(averageSalary),
        highestSalary,
        lowestSalary,
        byDepartment,
      },
    });
  })
);

// GET /api/employees/export — CSV export (V2, new)
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const employees = await Employee.find().sort({ createdAt: -1 });
    const header = ['Name', 'Email', 'Department', 'Role', 'Salary', 'Status'];
    const rows = employees.map((emp) => {
      const obj = normalizeStatus(emp);
      return [obj.name, obj.email, obj.department, obj.role || '', obj.salary ?? 0, obj.status]
        .map(escapeCsvField)
        .join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    res.status(200).send(csv);
  })
);

// DELETE /api/employees/reset-demo — bulk-delete all employees (V2.1).
// Intended for repeatedly resetting a demo/staging environment. Placed
// before the generic "/:id" routes so "reset-demo" is never mistaken
// for a Mongo ObjectId.
router.delete(
  '/reset-demo',
  asyncHandler(async (req, res) => {
    const result = await Employee.deleteMany({});
    logger.info('Demo data reset', { deletedCount: result.deletedCount });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  })
);

// GET /api/employees/:id — Get one
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw new AppError('Employee not found', 404);
    res.status(200).json({ success: true, data: normalizeStatus(employee) });
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
    res.status(200).json({ success: true, data: normalizeStatus(employee) });
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
