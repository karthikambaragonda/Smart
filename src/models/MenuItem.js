const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ["breakfast", "lunch", "snacks", "dinner"],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 1
    },
    isPopular: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MenuItem", menuItemSchema);
