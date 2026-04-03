const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    seats: {
      type: Number,
      required: true,
      min: 2,
      max: 12
    },
    status: {
      type: String,
      enum: ["available", "reserved", "occupied"],
      default: "available"
    },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },
    reservationPenaltyApplied: {
      type: Boolean,
      default: false
    },
    reservationWindow: {
      start: Date,
      end: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Table", tableSchema);
