const { MENU_WINDOWS } = require("./constants");

function getCurrentWindow(date = new Date()) {
  const hourDecimal = date.getHours() + date.getMinutes() / 60;
  return MENU_WINDOWS.find((window, index) => {
    const isLastWindow = index === MENU_WINDOWS.length - 1;
    return hourDecimal >= window.start && (isLastWindow ? hourDecimal <= window.end : hourDecimal < window.end);
  });
}

function getPickupDeadline() {
  return new Date(Date.now() + 5 * 60 * 1000);
}

function getEstimatedReadyTime(itemCount = 1) {
  const prepMinutes = Math.min(25, 8 + itemCount * 3);
  return new Date(Date.now() + prepMinutes * 60 * 1000);
}

function getTableReservationDeadline() {
  return new Date(Date.now() + 1 * 60 * 1000);
}

function getTimeRemaining(targetDate) {
  const distance = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, distance);
}

module.exports = {
  getCurrentWindow,
  getPickupDeadline,
  getEstimatedReadyTime,
  getTableReservationDeadline,
  getTimeRemaining
};
