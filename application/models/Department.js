const mongoose = require('mongoose');

// Managed list of department names shown as suggestions in the employee
// form and administered from Settings. This is intentionally separate
// from Employee.department (which stays a free-text string for backward
// compatibility with V1 data) — deleting a department here only removes
// it from the managed list, it never touches existing employee records.
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
