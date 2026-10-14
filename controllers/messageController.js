const Chat = require("../models/chats");
const Message = require("../models/messages");
const { deleteFromCloudinary } = require("../utils/cloudinary");

exports.uploadFile = async (req, res) => {
    req.on("aborted", () => {
        console.error("❌ Request was aborted by the client.");
    });
    try {
        if (!req.file || typeof req.file !== "object") {
            return res.status(400).json({ message: "No file received or invalid format" });
        }

        const { path, originalname, mimetype, size } = req.file;

        return res.status(200).json({
            url: path,
            filename: originalname,
            type: mimetype,
            size,
        });
    } catch (err) {
        console.error("❌ Upload error:", err);
        return res.status(500).json({ message: "Failed to upload", error: err.message });
    }
};

exports.deleteMessage = async (req, res) => {
    const { msg } = req.body;
    if (!msg) {
        return res.status(400).json({ message: "No message payload provided" });
    }
    try {
        if (msg.file?.url) {
            await deleteFromCloudinary(msg.file.url);
        }
        if (msg.sentTo?.chatId) {
            await Chat.updateOne(
                { _id: msg.sentTo.chatId },
                { $pull: { messages: msg._id } }
            );
        }
        await Message.findByIdAndDelete(msg._id);
        return res.status(200).json({ message: "Deleted Successfully" });
    } catch (err) {
        console.error("Delete message error:", err);
        return res.status(500).json({ message: "Failed to Delete Message" });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        await deleteFromCloudinary(req.body.fileUrl);
        return res.status(200).json({ message: "deleted file successfully" });
    } catch (err) {
        console.error("Delete file error:", err);
        return res.status(400).json({ message: err.message || "Error deleting file" });
    }
};

exports.deleteAllMessages = async (req, res) => {
    try {
        return res.json({ message: "Deleted All Messages and Files Virtually" });
    } catch (err) {
        console.error("Delete all messages error:", err);
        return res.status(400).json({ message: "Error in deleting Messages" });
    }
};
