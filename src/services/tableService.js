const Table = require("../models/Table");
const { emitTableEvent } = require("./socketService");

async function releaseExpiredTables() {
  const now = new Date();
  const expiredTables = await Table.find({
    status: "reserved",
    currentOrder: null,
    "reservationWindow.end": { $lte: now }
  });

  for (const table of expiredTables) {
    const reservedBy = table.reservedBy;

    table.status = "available";
    table.reservedBy = undefined;
    table.reservationWindow = undefined;
    await table.save();
    table.reservedBy = reservedBy;
    emitTableEvent(table, "reservation-expired");
  }
}

module.exports = {
  releaseExpiredTables
};
