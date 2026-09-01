const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    role: {
      type: String,
      trim: true,
      default: 'Employee',
    },
    salary: {
      type: Number,
      min: 0,
      default: 0,
    },
    // --- V2 addition ---
    // New, additive field. Existing V1 documents simply won't have this
    // field set in the database; we default it to 'Active' both here
    // (for new/updated docs) and defensively wherever V2 reads employees,
    // so V1 documents display sensibly without a migration being required.
    // V1's schema doesn't know about this field and will continue to
    // read/write documents fine — Mongoose (and MongoDB) ignore fields
    // that aren't declared in a schema, so nothing breaks on rollback.
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt automatically
  }
);

module.exports = mongoose.model('Employee', employeeSchema);
