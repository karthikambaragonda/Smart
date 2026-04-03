const Order = require("../models/Order");
const Table = require("../models/Table");
const User = require("../models/User");
const { emitOrderEvent, emitTableEvent } = require("./socketService");

async function runPenaltySweep() {
  const overdueOrders = await Order.find({
    pickedUp: false,
    penaltyApplied: false,
    status: "ready",
    pickupDeadline: { $lte: new Date() }
  });

  for (const order of overdueOrders) {
    const penaltyBase = order.subtotalAmount || order.totalAmount;
    order.penaltyApplied = true;
    order.status = "penalised";
    await order.save();

    if (order.orderType === "dine-in" && order.table) {
      const linkedTable = await Table.findById(order.table);
      if (linkedTable) {
        linkedTable.status = "available";
        linkedTable.reservedBy = null;
        linkedTable.currentOrder = null;
        linkedTable.reservationWindow = {};
        await linkedTable.save();
        emitTableEvent(linkedTable, "released");
      }
    }

    await User.findByIdAndUpdate(order.user, {
      $inc: {
        penaltyAmount: penaltyBase * 2
      },
      $push: {
        penaltyEntries: {
          reason: "order-no-pickup",
          amount: penaltyBase * 2,
          note: `Order not collected within 5 minutes after ready status.`
        }
      }
    });

    emitOrderEvent(order, "penalty-applied");
  }
}

module.exports = {
  runPenaltySweep
};
