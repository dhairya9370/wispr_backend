const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const createSessionMiddleware = require("./config/session");
const configurePassport = require("./config/passport");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

const createApp = () => {
    const app = express();

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false
    }));

    // CORS Configuration
    app.use(cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["Authorization"],
        preflightContinue: false,
        optionsSuccessStatus: 204,
        maxAge: 600
    }));
    app.options("*", cors());

    // Request body parsers (Express native)
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Trust Proxy for secure cookies on Render / reverse proxies
    app.set("trust proxy", 1);

    // Session Store
    app.use(createSessionMiddleware());

    // Passport Authentication
    const passport = configurePassport();
    app.use(passport.initialize());
    app.use(passport.session());

    // Base Health Check
    app.get("/", (req, res) => {
        res.send("Wispr 2.0 BACKEND SERVER ON RENDER Frontend: https://wispr-frontend-tau.vercel.app");
    });

    // Mount API and feature routes
    app.use(authRoutes);
    app.use(chatRoutes);
    app.use(messageRoutes);
    app.use(userRoutes);

    // Centralized Error Handler
    app.use(errorHandler);

    return app;
};

module.exports = createApp;
