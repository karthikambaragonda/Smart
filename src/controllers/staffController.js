const Order = require("../models/Order");
const Table = require("../models/Table");
const { validationResult } = require("express-validator");
const { emitOrderEvent, emitOrderUpdate, emitTableEvent, emitTableUpdate } = require("../services/socketService");
const { releaseExpiredTables } = require("../services/tableService");
const { getPickupDeadline } = require("../utils/time");

async function renderDashboard(req, res, next) {
  try {
    await releaseExpiredTables();
    const ordersRaw = await Order.find()
      .populate("user", "name email")
      .populate("table", "tableNumber status")
      .sort({ createdAt: -1 })
      .limit(50);
    const orders = ordersRaw.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
      return {
        ...order.toObject(),
        estimatedReadyAt: order.estimatedReadyAt || new Date(order.createdAt.getTime() + (8 + itemCount * 3) * 60 * 1000),
        pickupDeadline: order.pickupDeadline || null
      };
    });
    const pendingOrders = orders.filter((order) => ["placed", "preparing", "ready"].includes(order.status));
    const pastOrders = orders.filter((order) => ["delivered", "cancelled", "penalised"].includes(order.status));
    const tables = await Table.find().populate("reservedBy", "name").sort({ tableNumber: 1 });

    res.render("staff/dashboard", {
      title: "Staff Gateway",
      pendingOrders,
      pastOrders,
      tables
    });
  } catch (error) {
    next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      req.flash("error", validation.array()[0].msg);
      return res.redirect("/staff/dashboard");
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      req.flash("error", "Order not found.");
      return res.redirect("/staff/dashboard");
    }

    const wasReady = order.status === "ready";
    order.status = req.body.status;

    if (req.body.status === "ready" && !wasReady) {
      order.pickupDeadline = getPickupDeadline();
      if (order.orderType === "dine-in" && order.table) {
        const linkedTable = await Table.findById(order.table);
        if (linkedTable) {
          linkedTable.status = "occupied";
          linkedTable.reservationWindow = {};
          await linkedTable.save();
          emitTableEvent(linkedTable, "occupied");
        }
      }
    }

    if (req.body.status === "delivered") {
      order.pickedUp = true;
    }

    if (req.body.status !== "ready" && req.body.status !== "delivered") {
      order.pickupDeadline = null;
    }

    if (["cancelled", "penalised"].includes(req.body.status) && order.orderType === "dine-in" && order.table) {
      const linkedTable = await Table.findById(order.table);
      if (linkedTable) {
        linkedTable.status = "available";
        linkedTable.reservedBy = null;
        linkedTable.currentOrder = null;
        linkedTable.reservationPenaltyApplied = false;
        linkedTable.reservationWindow = {};
        await linkedTable.save();
        emitTableEvent(linkedTable, "released");
      }
    }

    await order.save();
    const eventType =
      req.body.status === "ready"
        ? "ready"
        : req.body.status === "delivered"
          ? "delivered"
          : "status-changed";
    emitOrderEvent(order, eventType);

    req.flash("success", "Order status updated.");
    res.redirect("/staff/dashboard");
  } catch (error) {
    next(error);
  }
}

async function updateTableStatus(req, res, next) {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      req.flash("error", validation.array()[0].msg);
      return res.redirect("/staff/dashboard");
    }

    const table = await Table.findById(req.params.id);

    if (!table) {
      req.flash("error", "Table not found.");
      return res.redirect("/staff/dashboard");
    }

    table.status = req.body.status;
    if (req.body.status === "available") {
      table.reservedBy = null;
      table.currentOrder = null;
      table.reservationPenaltyApplied = false;
      table.reservationWindow = {};
    }

    await table.save();
    const tableEventType =
      req.body.status === "occupied"
        ? "occupied"
        : req.body.status === "available"
          ? "released"
          : "updated";
    emitTableEvent(table, tableEventType);
    req.flash("success", "Table status updated.");
    res.redirect("/staff/dashboard");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderDashboard,
  updateOrderStatus,
  updateTableStatus
};
