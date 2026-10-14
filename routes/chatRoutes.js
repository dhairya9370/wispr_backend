const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { isLoggedIn } = require("../utils/authenticate");

router.post("/api/get-all-chats", isLoggedIn, chatController.getAllChats);
router.post("/api/get-active-chat", isLoggedIn, chatController.getActiveChat);
router.post("/api/get-chat-list", chatController.getChatList);
router.post("/api/create-new-chat", chatController.createNewChat);
router.post("/api/create-group", chatController.createGroup);
router.post("/api/update-group", chatController.updateGroup);
router.post("/api/set-pinned-chats", chatController.setPinnedChats);
router.post("/api/set-chat-unpinned", chatController.setChatUnpinned);
router.post("/api/delete-all-chats", chatController.deleteAllChats);

// Safe fallbacks for legacy GET /:id/chats routes so they never hang
router.get("/:id/chats", (req, res) => {
    res.status(200).json({ message: "Wispr chat endpoint" });
});
router.get("/:id/chats/:chatId", (req, res) => {
    res.status(200).json({ message: "Wispr chat details endpoint" });
});

module.exports = router;
