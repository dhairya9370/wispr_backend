const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isLoggedIn } = require("../utils/authenticate");

// Root-level auth routes (as expected by frontend)
router.post("/login", authController.login);
router.post("/logout", isLoggedIn, authController.logout);

// API-level auth routes
router.get("/api/session-info", authController.getSessionInfo);
router.post("/api/register", authController.register);
router.post("/api/setup-profile", isLoggedIn, authController.setupProfile);

module.exports = router;
