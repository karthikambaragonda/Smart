const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const Table = require("../models/Table");
const User = require("../models/User");
const { validationResult } = require("express-validator");
const { getManagerMetrics } = require("../services/dashboardService");
const { releaseExpiredTables } = require("../services/tableService");

function getNextTablePosition(existingCount) {
  const slots = [
    { x: 16, y: 18 },
    { x: 50, y: 18 },
    { x: 84, y: 18 },
    { x: 16, y: 50 },
    { x: 50, y: 50 },
    { x: 84, y: 50 },
    { x: 16, y: 82 },
    { x: 50, y: 82 },
    { x: 84, y: 82 }
  ];

  return slots[existingCount % slots.length];
}

async function renderDashboard(req, res, next) {
  try {
    await releaseExpiredTables();
    const [metrics, menuItems, recentOrdersRaw, users, tables] = await Promise.all([
      getManagerMetrics(),
      MenuItem.find().sort({ category: 1, name: 1 }),
      Order.find().populate("user", "name email").sort({ createdAt: -1 }).limit(10),
      User.find().select("-password").sort({ createdAt: -1 }).limit(10),
      Table.find().sort({ tableNumber: 1 })
    ]);
    const recentOrders = recentOrdersRaw.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
      return {
        ...order.toObject(),
        estimatedReadyAt: order.estimatedReadyAt || new Date(order.createdAt.getTime() + (8 + itemCount * 3) * 60 * 1000),
        pickupDeadline: order.pickupDeadline || null
      };
    });

    res.render("manager/dashboard", {
      title: "Manager Gateway",
      metrics,
      menuItems,
      recentOrders,
      users,
      tables,
      errors: [],
      formData: {}
    });
  } catch (error) {
    next(error);
  }
}

async function createMenuItem(req, res, next) {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      req.flash("error", validation.array()[0].msg);
      return res.redirect("/manager/dashboard");
    }

    await MenuItem.create(req.body);
    req.flash("success", "Menu item created.");
    res.redirect("/manager/dashboard");
  } catch (error) {
    next(error);
  }
}

async function createTable(req, res, next) {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      req.flash("error", validation.array()[0].msg);
      return res.redirect("/manager/dashboard");
    }

    const tableCount = await Table.countDocuments();
    const position = getNextTablePosition(tableCount);

    await Table.create({
      tableNumber: req.body.tableNumber,
      seats: req.body.seats,
      x: position.x,
      y: position.y
    });
    req.flash("success", "Table created.");
    res.redirect("/manager/dashboard");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderDashboard,
  createMenuItem,
  createTable
};
