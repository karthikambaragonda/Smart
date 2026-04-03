const Order = require("../models/Order");

async function getManagerMetrics() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = await Order.find({ createdAt: { $gte: todayStart } });
  const totalRevenue = todayOrders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const penaltyRevenue = todayOrders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + (order.carriedPenaltyAmount || 0), 0);

  const peakSlot = ["breakfast", "lunch", "snacks"]
    .map((slot) => ({
      slot,
      count: todayOrders.filter((order) => order.orderedForSlot === slot).length
    }))
    .sort((a, b) => b.count - a.count)[0];

  return {
    orderCount: todayOrders.length,
    totalRevenue,
    penaltyRevenue,
    peakSlot: peakSlot?.slot || "n/a",
    pendingCount: todayOrders.filter((order) => ["placed", "preparing", "ready"].includes(order.status))
      .length
  };
}

module.exports = {
  getManagerMetrics
};
