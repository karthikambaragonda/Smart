const MENU_WINDOWS = [
  { key: "breakfast", label: "Breakfast", start: 7, end: 11 },
  { key: "lunch", label: "Lunch", start: 11, end: 16 },
  { key: "snacks", label: "Snacks", start: 16, end: 18 },
  { key: "dinner", label: "Dinner", start: 18, end: 21 }
];

const COLLEGE_DOMAIN = "@sru.edu.in";

const CAMPUS_LOCATIONS = [
  "Block 1 - Ground Floor",
  "Block 2 - Ground Floor",
  "Block 3 - Ground Floor"
];

const ORDER_TYPES = ["dine-in", "takeaway", "delivery"];

const ORDER_STATUSES = ["placed", "preparing", "ready", "delivered", "cancelled", "penalised"];

const TABLE_STATUSES = ["available", "reserved", "occupied"];

module.exports = {
  MENU_WINDOWS,
  COLLEGE_DOMAIN,
  CAMPUS_LOCATIONS,
  ORDER_TYPES,
  ORDER_STATUSES,
  TABLE_STATUSES
};
