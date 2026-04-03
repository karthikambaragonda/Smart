const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    unitPrice: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [orderItemSchema],
    subtotalAmount: {
      type: Number,
      default: 0
    },
    carriedPenaltyAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    orderType: {
      type: String,
      enum: ["dine-in", "takeaway", "delivery"],
      required: true
    },
    deliveryLocation: {
      type: String,
      trim: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      default: null
    },
    serviceLocation: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["placed", "preparing", "ready", "delivered", "cancelled", "penalised"],
      default: "placed"
    },
    pickedUp: {
      type: Boolean,
      default: false
    },
    penaltyApplied: {
      type: Boolean,
      default: false
    },
    pickupDeadline: {
      type: Date,
      default: null
    },
    estimatedReadyAt: {
      type: Date,
      required: true
    },
    orderedForSlot: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
