const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://newuser:pJ7M6FAiYuZnNBb8@cluster0-shard-00-00.wkq5i.mongodb.net:27017,cluster0-shard-00-01.wkq5i.mongodb.net:27017,cluster0-shard-00-02.wkq5i.mongodb.net:27017/?ssl=true&replicaSet=atlas-f7mld6-shard-0&authSource=admin&appName=Cluster0"
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
