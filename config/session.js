const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const session = require("express-session");
const MongoStore = require("connect-mongo");

const createSessionMiddleware = () => {
    const atlas_url = process.env.ATLAS_DB_URL;
    const sessionSecret = process.env.SECRET || "wispr_session_secret_default";

    if (!process.env.SECRET) {
        console.warn("⚠️ Warning: process.env.SECRET is undefined. Using default session secret.");
    }

    const store = MongoStore.create({
        mongoUrl: atlas_url,
        crypto: {
            secret: sessionSecret
        },
        touchAfter: 3 * 3600,
    });

    store.on("error", (err) => {
        console.error("ERROR IN MONGO SESSION STORE:", err);
    });

    return session({
        store,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        name: "newSession",
        cookie: {
            maxAge: 1000 * 60 * 60 * 3,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        }
    });
};

module.exports = createSessionMiddleware;
