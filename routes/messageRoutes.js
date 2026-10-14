const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { upload } = require("../utils/cloudinary");
const { isLoggedIn } = require("../utils/authenticate");

// Upload route at root level (as expected by frontend)
router.post("/upload", isLoggedIn, upload.single("file"), messageController.uploadFile);

// Message API routes
router.post("/api/delete-message", isLoggedIn, messageController.deleteMessage);
router.post("/api/delete-file", messageController.deleteFile);
router.post("/api/delete-all-messages", messageController.deleteAllMessages);

module.exports = router;
