const mongoose = require('mongoose');

// Managed list of role names — mirrors Department.js. Employee.role stays
// free text for backward compatibility; this is just the suggestion list
// used in the employee form and administered from Settings.
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
