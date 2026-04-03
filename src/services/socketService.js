let ioInstance;

function attachIo(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("join-user-room", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("join-role-room", (role) => {
      socket.join(`role:${role}`);
    });
  });
}

function emitOrderUpdate(order) {
  emitOrderEvent(order, "updated");
}

function emitOrderEvent(order, eventType = "updated") {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`user:${order.user}`).emit("order:update", {
    order,
    eventType
  });
  ioInstance.to("role:staff").emit("dashboard:refresh", {
    kind: "order",
    eventType,
    orderId: order._id
  });
  ioInstance.to("role:manager").emit("dashboard:refresh", {
    kind: "order",
    eventType,
    orderId: order._id
  });

  if (eventType === "created") {
    ioInstance.to("role:staff").emit("notification", {
      audience: "staff",
      type: "new-order",
      title: "New order received",
      message: "A new food order has been placed and is waiting in the kitchen queue."
    });
  }

  if (eventType === "ready") {
    ioInstance.to(`user:${order.user}`).emit("notification", {
      audience: "consumer",
      type: "order-ready",
      title: "Order ready for pickup",
      message: `Collect your order from ${order.serviceLocation || "Pickup Counter"} before the timer ends.`
    });
  }

  if (eventType === "delivered") {
    ioInstance.to(`user:${order.user}`).emit("notification", {
      audience: "consumer",
      type: "order-delivered",
      title: "Order delivered",
      message: "Your order has been completed successfully."
    });
  }

  if (eventType === "status-changed" && order.status !== "ready") {
    ioInstance.to(`user:${order.user}`).emit("notification", {
      audience: "consumer",
      type: "order-status",
      title: "Order status updated",
      message: `Your order status is now ${order.status}.`
    });
  }

  if (eventType === "penalty-applied") {
    ioInstance.to(`user:${order.user}`).emit("notification", {
      audience: "consumer",
      type: "penalty",
      title: "Pickup penalty applied",
      message: "A penalty was added because the ready order was not collected on time."
    });
  }
}

function emitTableUpdate(table) {
  emitTableEvent(table, "updated");
}

function emitTableEvent(table, eventType = "updated") {
  if (!ioInstance) {
    return;
  }

  ioInstance.to("role:staff").emit("dashboard:refresh", {
    kind: "table",
    eventType,
    tableId: table._id
  });
  ioInstance.to("role:manager").emit("dashboard:refresh", {
    kind: "table",
    eventType,
    tableId: table._id
  });
  ioInstance.to("role:consumer").emit("dashboard:refresh", {
    kind: "table",
    eventType,
    tableId: table._id
  });

  if (eventType === "reserved") {
    ioInstance.to("role:staff").emit("notification", {
      audience: "staff",
      type: "table-reserved",
      title: "New table reservation",
      message: `Table ${table.tableNumber} has just been reserved by a consumer.`
    });
    if (table.reservedBy) {
      ioInstance.to(`user:${table.reservedBy}`).emit("notification", {
        audience: "consumer",
        type: "table-reserved",
        title: "Table reserved",
        message: `Table ${table.tableNumber} is reserved for 1 minute.`
      });
    }
  }

  if (eventType === "occupied" && table.reservedBy) {
    ioInstance.to(`user:${table.reservedBy}`).emit("notification", {
      audience: "consumer",
      type: "table-occupied",
      title: "Table marked occupied",
      message: `Table ${table.tableNumber} is now active for your dine-in order.`
    });
  }

  if (eventType === "reservation-expired" && table.reservedBy) {
    ioInstance.to(`user:${table.reservedBy}`).emit("notification", {
      audience: "consumer",
      type: "table-reserved",
      title: "Reservation expired",
      message: `Table ${table.tableNumber} was released because the reservation time ended.`
    });
  }
}

module.exports = {
  attachIo,
  emitOrderUpdate,
  emitOrderEvent,
  emitTableUpdate,
  emitTableEvent
};
