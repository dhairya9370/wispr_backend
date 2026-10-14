const { Server } = require("socket.io");
const registerSocketHandlers = require("./socketHandlers");

const initSocketServer = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        registerSocketHandlers(io, socket);
    });

    return io;
};

module.exports = initSocketServer;
