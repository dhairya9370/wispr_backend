const Chat = require("../models/chats");
const User = require("../models/users");

exports.getAllChats = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.json({ chatList: [] });
        }
        const chatList = await Chat.find({
            participants: userId
        })
            .populate("participants")
            .populate("messages");

        return res.json({ chatList });
    } catch (err) {
        console.error("Get all chats error:", err);
        return res.status(500).json({ message: "Failed to fetch chats" });
    }
};

exports.getActiveChat = async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!chatId) {
            return res.status(400).json({ message: "Missing chatId" });
        }
        const activeChat = await Chat.findById(chatId)
            .populate("messages")
            .populate("participants");

        return res.json({ activeChat });
    } catch (err) {
        console.error("Get active chat error:", err);
        return res.status(500).json({ message: "Failed to fetch active chat" });
    }
};

exports.getChatList = async (req, res) => {
    const { value, userId } = req.body;
    if (!value || !userId) {
        return res.status(400).json({ message: "Search term or userId missing" });
    }
    try {
        const result = await User.find({
            $or: [
                { username: { $regex: value, $options: "i" } },
                { name: { $regex: value, $options: "i" } },
            ]
        }).select("-hash -salt");

        const filteredResult = result.filter(
            (user) => user?._id.toString() !== userId.toString()
        );

        return res.status(200).json(filteredResult);
    } catch (err) {
        return res.status(400).json({ message: err.message || "Failed To Fetch user" });
    }
};

exports.createNewChat = async (req, res) => {
    const { participants } = req.body;
    try {
        const result = await Chat.find({
            participants: { $all: participants },
            $expr: { $eq: [{ $size: "$participants" }, 2] }
        });

        if (result.length) {
            return res.status(200).json({ message: "Chat Already Exists", chat: result[0] });
        } else {
            const newChat = new Chat({ participants });
            const savedChat = await newChat.save();
            return res.status(200).json({ message: "Created Chat Successfully", chat: savedChat });
        }
    } catch (err) {
        console.error("Create new chat error:", err);
        return res.status(400).json({ message: err.message || "Failed To Create Chat" });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { participants, createdBy } = req.body;
        const newGroup = new Chat({
            isGroup: true,
            group: {
                name: "Untitled Group",
                createdBy,
                createdAt: Date.now(),
                admins: [createdBy],
            },
            participants: [...participants, createdBy],
        });
        const savedGroup = await newGroup.save();
        return res.status(200).json({ message: "Created Group Successfully", group: savedGroup });
    } catch (err) {
        console.error("Create group error:", err);
        return res.status(400).json({ message: err.message || "Failed To Create Group" });
    }
};

exports.updateGroup = async (req, res) => {
    try {
        const { chatId, formData } = req.body;
        if (!chatId || !formData) {
            return res.status(400).json({ message: "Missing Credentials" });
        }
        const { dp, name, admins } = formData;
        const updateFields = {};
        if (name?.trim()) updateFields.name = name;
        if (dp?.trim()) updateFields["group.dp"] = dp;
        if (name?.trim()) updateFields["group.name"] = name;
        if (admins?.length > 0) updateFields["group.admins"] = admins;

        const savedGroup = await Chat.findByIdAndUpdate(chatId, {
            $set: updateFields
        }, { new: true });

        return res.status(200).json({ message: "Updated Group Successfully", chat: savedGroup });
    } catch (err) {
        console.error("Update group error:", err);
        return res.status(400).json({ message: err.message || "Failed To Update Group" });
    }
};

exports.setPinnedChats = async (req, res) => {
    try {
        const { userId, chatId } = req.body;
        const result = await User.findByIdAndUpdate(
            userId,
            { $push: { "ui.pinned": chatId } },
            { new: true }
        );
        return res.status(200).json({ message: "Pinned Successfully", user: result });
    } catch (err) {
        console.error("Pin chat error:", err);
        return res.status(400).json({ message: err.message || "Error in pinning Chat" });
    }
};

exports.setChatUnpinned = async (req, res) => {
    try {
        const { userId, chatId } = req.body;
        const result = await User.findByIdAndUpdate(
            userId,
            { $pull: { "ui.pinned": chatId } },
            { new: true }
        );
        return res.status(200).json({ message: "Unpinned Successfully", user: result });
    } catch (err) {
        console.error("Unpin chat error:", err);
        return res.status(400).json({ message: err.message || "Error in Unpinning Chat" });
    }
};

exports.deleteAllChats = async (req, res) => {
    try {
        return res.json({ message: "Deleted All Chats and Files Virtually" });
    } catch (err) {
        return res.status(400).json({ message: "Error in deleting Chats" });
    }
};
