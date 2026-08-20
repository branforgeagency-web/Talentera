const mongoose = require("mongoose");
const dns = require("dns");

// Set DNS servers to resolve MongoDB Atlas SRV records if local DNS fails
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;

