const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const http = require("http");
const connectDB = require("./config/db");
const createApp = require("./app");
const initSocketServer = require("./sockets");

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});

const startServer = async () => {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Initialize Express App
    const app = createApp();

    // 3. Create HTTP Server & attach Socket.IO
    const server = http.createServer(app);
    initSocketServer(server);

    // 4. Start Listening
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Wispr backend server running on port ${PORT}`);
    });
};

startServer();
