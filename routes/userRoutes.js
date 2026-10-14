const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { isLoggedIn } = require("../utils/authenticate");

router.post("/api/user-status", isLoggedIn, userController.getUserStatus);
router.post("/api/online-participants", isLoggedIn, userController.getOnlineParticipants);
router.post("/api/get-all-users", userController.getAllUsers);
router.post("/api/get-user", userController.getUser);

module.exports = router;
