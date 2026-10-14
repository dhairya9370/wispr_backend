const mongoose = require("mongoose");

const connectDB = async () => {
    const atlas_url = process.env.ATLAS_DB_URL;
    if (!atlas_url) {
        console.error("❌ ATLAS_DB_URL environment variable is missing!");
        process.exit(1);
    }

    try {
        await mongoose.connect(atlas_url);
        console.log("✅ MongoDB connection Established");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        console.log("🔄 Retrying in 10s...");
        setTimeout(connectDB, 10000);
    }
};

mongoose.connection.on("disconnected", () => {
    console.log("⚠️ MongoDB disconnected!");
});

mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error event:", err);
});

module.exports = connectDB;
