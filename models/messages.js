const mongoose = require("mongoose");
const User = require("./users");
const Chat = require("./chats");
const FileSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    size: {
        type: Number
    }
});

const msgSchema = new mongoose.Schema({
    content: {
        type: String,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    file: {
        type: FileSchema,
        required: false
    },
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    sentTo: {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat"
        },
        at: Date,
    },
    deliveredTo: [{
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        at: Date,
    }],
    seenBy: [{
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        at: Date,
    }],
});

const Message = mongoose.model("Message", msgSchema);
module.exports = Message;