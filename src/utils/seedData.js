require("dotenv").config();

const connectDB = require("../config/db");
const MenuItem = require("../models/MenuItem");
const Table = require("../models/Table");
const User = require("../models/User");

async function seed() {
  await connectDB();

  await Promise.all([
    MenuItem.deleteMany({}),
    Table.deleteMany({}),
    User.deleteMany({})
  ]);

  await MenuItem.insertMany([
    { name: "Masala Dosa", description: "Crisp dosa with chutney and sambar.", category: "breakfast", price: 50, isPopular: true },
    { name: "Idli Combo", description: "Soft idlis with sambar.", category: "breakfast", price: 40 },
    { name: "Veg Meals", description: "Rice, curry, dal, and curd.", category: "lunch", price: 90, isPopular: true },
    { name: "Paneer Fried Rice", description: "Fresh fried rice with paneer.", category: "lunch", price: 110 },
    { name: "Samosa Plate", description: "Two samosas with sauce.", category: "snacks", price: 35, isPopular: true },
    { name: "Tea and Biscuit", description: "Quick snack combo.", category: "snacks", price: 20 },
    { name: "Chapati Curry Combo", description: "Soft chapatis with veg curry.", category: "dinner", price: 85, isPopular: true },
    { name: "Egg Fried Rice", description: "Hot fried rice for evening dining.", category: "dinner", price: 95 }
  ]);

  await Table.insertMany([
    { tableNumber: "T1", x: 12, y: 10, seats: 4 },
    { tableNumber: "T2", x: 42, y: 10, seats: 4 },
    { tableNumber: "T3", x: 72, y: 10, seats: 6 },
    { tableNumber: "T4", x: 12, y: 42, seats: 2 },
    { tableNumber: "T5", x: 42, y: 42, seats: 6 },
    { tableNumber: "T6", x: 72, y: 42, seats: 4 }
  ]);

  await User.create([
    { name: "Campus Consumer", email: "student@sru.edu.in", password: "Student@123", role: "consumer", department: "CSE" },
    { name: "Canteen Staff", email: "staff@sru.edu.in", password: "Staff@123", role: "staff", department: "Operations" },
    { name: "Canteen Manager", email: "manager@sru.edu.in", password: "Manager@123", role: "manager", department: "Administration" }
  ]);

  console.log("Seed complete");
  process.exit(0);
}

seed();
