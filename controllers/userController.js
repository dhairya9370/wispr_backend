const User = require("../models/users");

exports.getUserStatus = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const result = await User.findById(recipientId, { online: 1, _id: 0 });
        return res.json(result);
    } catch (err) {
        console.error("Get user status error:", err);
        return res.status(500).json({ message: "Error fetching user status" });
    }
};

exports.getOnlineParticipants = async (req, res) => {
    try {
        const { recipients } = req.body;
        const result = await User.find(
            { _id: { $in: recipients }, "online.is": true },
            { _id: 1 }
        );
        return res.json(result);
    } catch (err) {
        console.error("Get online participants error:", err);
        return res.status(500).json({ message: "Error fetching online participants" });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const userList = await User.find({}).select("-hash -salt");
        return res.status(200).json(userList);
    } catch (err) {
        console.error("Get all users error:", err);
        return res.status(400).json({ message: "Error in Fetching User List" });
    }
};

exports.getUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId).select("-hash -salt");
        return res.status(200).json(user);
    } catch (err) {
        console.error("Get user error:", err);
        return res.status(400).json({ message: "Error in Fetching User" });
    }
};
