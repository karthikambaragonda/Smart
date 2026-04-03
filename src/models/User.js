const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 60
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8
    },
    role: {
      type: String,
      enum: ["consumer", "staff", "manager"],
      default: "consumer"
    },
    department: {
      type: String,
      trim: true,
      maxlength: 80
    },
    blocked: {
      type: Boolean,
      default: false
    },
    penaltyAmount: {
      type: Number,
      default: 0
    },
    penaltyEntries: [
      {
        reason: {
          type: String,
          enum: ["order-no-pickup", "table-no-show"],
          required: true
        },
        amount: {
          type: Number,
          required: true,
          min: 1
        },
        note: {
          type: String,
          trim: true,
          maxlength: 160
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
