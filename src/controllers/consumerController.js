const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const Table = require("../models/Table");
const User = require("../models/User");
const { validationResult } = require("express-validator");
const { CAMPUS_LOCATIONS, ORDER_TYPES } = require("../utils/constants");
const { getCurrentWindow, getEstimatedReadyTime, getTableReservationDeadline } = require("../utils/time");
const { releaseExpiredTables } = require("../services/tableService");
const { emitOrderEvent, emitTableEvent, emitTableUpdate } = require("../services/socketService");

function getReservedTableForUser(userId) {
  return Table.findOne({
    reservedBy: userId,
    status: "reserved",
    $or: [
      { currentOrder: { $ne: null } },
      { "reservationWindow.end": { $gt: new Date() } }
    ]
  });
}

function buildCartPayload(items, orderType, deliveryLocation, orderedForSlot, table) {
  const subtotalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return {
    items,
    orderType,
    deliveryLocation: orderType === "delivery" ? deliveryLocation : "",
    orderedForSlot,
    subtotalAmount,
    carriedPenaltyAmount: 0,
    totalAmount: subtotalAmount,
    tableId: table?._id?.toString() || null,
    tableNumber: table?.tableNumber || null
  };
}

async function renderDashboard(req, res, next) {
  try {
    await releaseExpiredTables();
    const activeWindow = getCurrentWindow();
    const menuItems = activeWindow
      ? await MenuItem.find({ category: activeWindow.key, isAvailable: true }).sort({ isPopular: -1, name: 1 })
      : [];
    const readyPickupOrderRaw = await Order.findOne({
      user: req.user._id,
      status: "ready",
      pickedUp: false,
      pickupDeadline: { $gt: new Date() }
    }).sort({ updatedAt: -1, createdAt: -1 });
    const tables = await Table.find().sort({ tableNumber: 1 });
    const reservedTable = await getReservedTableForUser(req.user._id);
    const readyPickupOrder = readyPickupOrderRaw
      ? {
          ...readyPickupOrderRaw.toObject(),
          pickupDeadline: readyPickupOrderRaw.pickupDeadline,
          serviceLocation: readyPickupOrderRaw.serviceLocation || "Pickup Counter"
        }
      : null;
    res.render("consumer/dashboard", {
      title: "Consumer Portal",
      activeWindow,
      menuItems,
      locations: CAMPUS_LOCATIONS,
      orderTypes: ORDER_TYPES,
      tables,
      reservedTable,
      readyPickupOrder,
      cart: req.session.cart || null,
      errors: [],
      formData: {}
    });
  } catch (error) {
    next(error);
  }
}

async function renderOrdersPage(req, res, next) {
  try {
    await releaseExpiredTables();
    const ordersRaw = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    const orders = ordersRaw.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
      return {
        ...order.toObject(),
        estimatedReadyAt: order.estimatedReadyAt || getEstimatedReadyTime(itemCount),
        pickupDeadline: order.pickupDeadline || null
      };
    });

    res.render("consumer/orders", {
      title: "My Orders",
      orders
    });
  } catch (error) {
    next(error);
  }
}

function renderPenaltiesPage(req, res) {
  const penaltyEntries = [...(req.user.penaltyEntries || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.render("consumer/penalties", {
    title: "Penalty Summary",
    penaltyEntries,
    penaltyAmount: req.user.penaltyAmount
  });
}

async function renderThankYouPage(req, res, next) {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate("table");

    if (!order || order.status !== "delivered") {
      req.flash("error", "Thank you page is available only for delivered orders.");
      return res.redirect("/consumer/orders");
    }

    res.render("consumer/thank-you", {
      title: "Thank You",
      order
    });
  } catch (error) {
    next(error);
  }
}

async function freeTableFromThankYou(req, res, next) {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: "delivered"
    });

    if (!order || !order.table) {
      req.flash("error", "No linked table found for this order.");
      return res.redirect("/consumer/orders");
    }

    const table = await Table.findById(order.table);
    if (!table) {
      req.flash("error", "Linked table not found.");
      return res.redirect("/consumer/orders");
    }

    table.status = "available";
    table.reservedBy = null;
    table.currentOrder = null;
    table.reservationPenaltyApplied = false;
    table.reservationWindow = {};
    await table.save();
    emitTableUpdate(table);

    req.flash("success", `Table ${table.tableNumber} is now free. Thank you.`);
    res.redirect(`/consumer/orders/${order._id}/thank-you`);
  } catch (error) {
    next(error);
  }
}

async function addToCart(req, res, next) {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      req.flash("error", validation.array()[0].msg);
      return res.redirect("/consumer/dashboard");
    }

    const activeWindow = getCurrentWindow();

    if (!activeWindow) {
      req.flash("error", "Canteen is currently closed. Orders can only be placed during active service slots.");
      return res.redirect("/consumer/dashboard");
    }

    const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds : [req.body.itemIds].filter(Boolean);
    const quantities = Array.isArray(req.body.quantities)
      ? req.body.quantities
      : [req.body.quantities].filter(Boolean);

    const menuItems = await MenuItem.find({ _id: { $in: itemIds }, category: activeWindow.key, isAvailable: true });

    if (!menuItems.length) {
      req.flash("error", "Please choose at least one valid menu item.");
      return res.redirect("/consumer/dashboard");
    }

    const items = menuItems.map((item) => {
      const index = itemIds.findIndex((id) => id === item._id.toString());
      const quantity = Number(quantities[index] || 1);
      return {
        menuItem: item._id,
        name: item.name,
        quantity,
        unitPrice: item.price
      };
    });

    if (!ORDER_TYPES.includes(req.body.orderType)) {
      req.flash("error", "Please choose a valid order type.");
      return res.redirect("/consumer/dashboard");
    }

    if (req.body.orderType === "delivery" && !CAMPUS_LOCATIONS.includes(req.body.deliveryLocation)) {
      req.flash("error", "Please choose a valid campus delivery location.");
      return res.redirect("/consumer/dashboard");
    }

    let reservedTable = null;
    if (req.body.orderType === "dine-in") {
      reservedTable = await getReservedTableForUser(req.user._id);

      if (!reservedTable) {
        req.flash("error", "Please reserve a table first before placing a dine-in order.");
        return res.redirect("/consumer/dashboard");
      }
    }

    req.session.cart = buildCartPayload(
      items,
      req.body.orderType,
      req.body.deliveryLocation,
      activeWindow.key,
      reservedTable
    );

    req.flash("success", "Items added to cart. Review your order before confirming.");
    res.redirect("/consumer/cart");
  } catch (error) {
    next(error);
  }
}

async function renderCart(req, res, next) {
  try {
    await releaseExpiredTables();
    const cart = req.session.cart;

    if (!cart || !cart.items?.length) {
      req.flash("error", "Your cart is empty.");
      return res.redirect("/consumer/dashboard");
    }

    let table = null;
    if (cart.orderType === "dine-in") {
      table = await getReservedTableForUser(req.user._id);
      if (!table) {
        req.flash("error", "Your dine-in cart needs an active reserved table. Please reserve a table again.");
        return res.redirect("/consumer/dashboard");
      }
      cart.tableId = table._id.toString();
      cart.tableNumber = table.tableNumber;
    }

    if (typeof cart.subtotalAmount !== "number") {
      cart.subtotalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }

    const user = await User.findById(req.user._id).select("penaltyAmount");
    const carriedPenaltyAmount = user?.penaltyAmount || 0;
    cart.carriedPenaltyAmount = carriedPenaltyAmount;
    cart.totalAmount = cart.subtotalAmount + carriedPenaltyAmount;

    res.render("consumer/cart", {
      title: "Review Cart",
      cart,
      table
    });
  } catch (error) {
    next(error);
  }
}

async function confirmOrder(req, res, next) {
  try {
    const cart = req.session.cart;
    if (!cart || !cart.items?.length) {
      req.flash("error", "Your cart is empty.");
      return res.redirect("/consumer/dashboard");
    }

    const activeWindow = getCurrentWindow();
    if (!activeWindow || activeWindow.key !== cart.orderedForSlot) {
      req.flash("error", "The menu slot changed before confirmation. Please add the order again.");
      req.session.cart = null;
      return res.redirect("/consumer/dashboard");
    }

    const currentMenuItems = await MenuItem.find({
      _id: { $in: cart.items.map((item) => item.menuItem) },
      category: cart.orderedForSlot,
      isAvailable: true
    });

    if (currentMenuItems.length !== cart.items.length) {
      req.flash("error", "One or more items are no longer available. Please rebuild your cart.");
      req.session.cart = null;
      return res.redirect("/consumer/dashboard");
    }

    const user = await User.findById(req.user._id).select("penaltyAmount");
    const outstandingPenalty = user?.penaltyAmount || 0;
    const subtotalAmount =
      typeof cart.subtotalAmount === "number"
        ? cart.subtotalAmount
        : cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    let table = null;
    let serviceLocation = "Pickup Counter";
    if (cart.orderType === "dine-in") {
      table = await getReservedTableForUser(req.user._id);
      if (!table) {
        req.flash("error", "Your reserved table expired. Please reserve a table again.");
        req.session.cart = null;
        return res.redirect("/consumer/dashboard");
      }
      serviceLocation = `Table ${table.tableNumber}`;
    }

    if (cart.orderType === "delivery") {
      serviceLocation = cart.deliveryLocation;
    }

    const order = await Order.create({
      user: req.user._id,
      items: cart.items,
      subtotalAmount,
      carriedPenaltyAmount: outstandingPenalty,
      totalAmount: subtotalAmount + outstandingPenalty,
      orderType: cart.orderType,
      deliveryLocation: cart.deliveryLocation,
      table: table?._id || null,
      serviceLocation,
      estimatedReadyAt: getEstimatedReadyTime(cart.items.reduce((sum, item) => sum + item.quantity, 0)),
      orderedForSlot: cart.orderedForSlot
    });

    if (table) {
      table.currentOrder = order._id;
      table.reservationWindow = {
        start: table.reservationWindow?.start || new Date(),
        end: null
      };
      await table.save();
      emitTableEvent(table, "updated");
    }

    emitOrderEvent(order, "created");

    if (outstandingPenalty > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          penaltyAmount: 0
        }
      });
    }

    req.session.cart = null;
    req.flash("success", "Order confirmed successfully. You will be notified when it is ready.");
    res.redirect("/consumer/dashboard");
  } catch (error) {
    next(error);
  }
}

function cancelCart(req, res) {
  req.session.cart = null;
  req.flash("success", "Cart cancelled.");
  res.redirect("/consumer/dashboard");
}

async function reserveTable(req, res, next) {
  try {
    if (req.body.selectedOrderType !== "dine-in") {
      req.flash("error", "Table booking is available only for dine-in orders.");
      return res.redirect("/consumer/dashboard");
    }

    const activeReservation = await getReservedTableForUser(req.user._id);
    if (activeReservation) {
      req.flash("error", `You already have table ${activeReservation.tableNumber} reserved. New dine-in orders will map to that same table.`);
      return res.redirect("/consumer/dashboard");
    }

    const table = await Table.findById(req.body.tableId);

    if (!table || table.status !== "available") {
      req.flash("error", "That table is no longer available.");
      return res.redirect("/consumer/dashboard");
    }

    const start = new Date();
    const end = getTableReservationDeadline();

    table.status = "reserved";
    table.reservedBy = req.user._id;
    table.currentOrder = null;
    table.reservationPenaltyApplied = false;
    table.reservationWindow = { start, end };
    await table.save();
    emitTableEvent(table, "reserved");

    req.flash("success", `Table ${table.tableNumber} reserved for the next 1 minute.`);
    res.redirect("/consumer/dashboard");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderDashboard,
  renderOrdersPage,
  renderPenaltiesPage,
  renderThankYouPage,
  freeTableFromThankYou,
  addToCart,
  renderCart,
  confirmOrder,
  cancelCart,
  reserveTable
};
