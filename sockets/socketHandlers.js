const User = require("../models/users");
const Chat = require("../models/chats");
const Message = require("../models/messages");
const userManager = require("./userManager");

const registerSocketHandlers = (io, socket) => {
    // 1. User connects
    socket.on("user-connect", async (userId) => {
        if (!userId) return;

        const { isFirstSocket } = userManager.addUser(socket.id, userId);

        let user;
        if (isFirstSocket) {
            user = await User.findByIdAndUpdate(
                userId,
                { online: { is: true, last: new Date() } },
                { new: true }
            );
            socket.broadcast.emit("user-online", { userId });
        } else {
            user = await User.findById(userId);
        }

        socket.emit("set-user-ui", { user });
        console.log("Client connected:", socket.id, "User:", userId);
    });

    // 2. Start undelivered messages backup
    socket.on("start-backup", async (userId) => {
        if (!userId) {
            return socket.emit("backup-progress", 100);
        }

        const allChats = await Chat.find({ participants: userId }).populate("messages");
        if (!allChats || !allChats.length) {
            return socket.emit("backup-progress", 100);
        }

        socket.emit("backup-progress", 0);
        let count = 0;

        for (let i = 0; i < allChats.length; i++) {
            for (let j = 0; j < allChats[i].messages.length; j++) {
                const msg = allChats[i].messages[j];
                const isDelivered =
                    msg.from.toString() !== userId.toString() &&
                    msg.deliveredTo.length > 0 &&
                    msg.deliveredTo.some((entry) => entry.recipientId?.toString() === userId.toString());
                if (!isDelivered && msg.from.toString() !== userId.toString()) {
                    count++;
                }
            }
        }

        if (count === 0) {
            return socket.emit("backup-progress", 100);
        }

        let currProgress = 0;
        let lastEmitted = 0;

        for (let i = 0; i < allChats.length; i++) {
            for (let j = 0; j < allChats[i].messages.length; j++) {
                const msg = allChats[i].messages[j];
                const isSent = msg.from.toString() === userId.toString();
                const isDeliveredBySender = msg.deliveredTo.some(
                    (entry) => entry.recipientId?.toString() === userId.toString()
                );

                if (!isSent && !isDeliveredBySender) {
                    const deliveredMsg = await Message.findByIdAndUpdate(
                        msg._id,
                        { $push: { deliveredTo: { recipientId: userId, at: new Date() } } },
                        { new: true }
                    );

                    const senderSockets = userManager.getSockets(msg.from);
                    for (const sId of senderSockets) {
                        io.to(sId).emit("message-delivered", deliveredMsg);
                    }

                    currProgress += 1;
                    const percent = Math.floor((currProgress / count) * 100);
                    if (percent - lastEmitted >= 5) {
                        socket.emit("backup-progress", percent);
                        lastEmitted = percent;
                    }
                }
            }
        }

        socket.emit("backup-progress", 100);
    });

    // 3. Send message
    socket.on("send-message", async ({ uuid, from, content, file, sentTo: { chatId, at } }) => {
        try {
            const newMsg = new Message({
                from,
                content,
                file,
                sentTo: {
                    chatId,
                    at,
                }
            });
            const savedResult = await newMsg.save();

            const updatedChat = await Chat.findByIdAndUpdate(
                chatId,
                { $push: { messages: savedResult._id } },
                { new: true }
            );

            if (!updatedChat) {
                console.error("Chat not found for chatId:", chatId);
                return;
            }

            const recipients = updatedChat.participants.filter(
                (p) => p.toString() !== from.toString()
            );

            socket.emit("message-sent", { msg: savedResult, uuid });

            // Efficiently deliver to all online participants in this chat
            let deliveredCount = 0;
            let latestMsg = savedResult;

            for (const recipientId of recipients) {
                const recipientSockets = userManager.getSockets(recipientId);
                if (recipientSockets.length > 0) {
                    const updatedMsg = await Message.findByIdAndUpdate(
                        savedResult._id,
                        { $push: { deliveredTo: { recipientId, at: new Date() } } },
                        { new: true }
                    );
                    latestMsg = updatedMsg;
                    deliveredCount++;

                    for (const sId of recipientSockets) {
                        io.to(sId).emit("received-message", updatedMsg);
                    }
                }
            }

            if (recipients.length > 0 && deliveredCount === recipients.length) {
                socket.emit("message-delivered", latestMsg);
            }
        } catch (err) {
            console.error("Error in send-message socket handler:", err);
        }
    });

    // 4. Chat active (mark seen)
    socket.on("chat-active", async ({ activeChat }) => {
        try {
            const receiverId = userManager.getUserId(socket.id);
            if (!receiverId || !activeChat || !activeChat.participants) return;

            for (const participant of activeChat.participants) {
                const participantId = participant._id?.toString() || participant.toString();
                if (participantId !== receiverId) {
                    const senderSockets = userManager.getSockets(participantId);
                    const chatDoc = await Chat.findById(activeChat._id, { messages: 1 }).populate("messages");
                    let updatedMsgs = [];

                    if (chatDoc && chatDoc.messages && chatDoc.messages.length > 0) {
                        for (const message of chatDoc.messages) {
                            if (message.from.toString() === participantId) {
                                const isDelivered = message.deliveredTo.some(
                                    (el) => el.recipientId.toString() === receiverId
                                );
                                const isSeen = message.seenBy.some(
                                    (el) => el.recipientId.toString() === receiverId
                                );

                                if (isDelivered && !isSeen) {
                                    const updatedMsg = await Message.findByIdAndUpdate(
                                        message._id,
                                        { $push: { seenBy: { recipientId: receiverId, at: new Date() } } },
                                        { new: true }
                                    );
                                    updatedMsgs.push(updatedMsg);
                                }
                            }
                        }
                    }

                    if (senderSockets.length > 0 && updatedMsgs.length > 0) {
                        let seenByAll = true;
                        for (const msg of updatedMsgs) {
                            for (const recipient of activeChat.participants) {
                                const rId = recipient._id?.toString() || recipient.toString();
                                if (
                                    msg.from.toString() !== rId &&
                                    !msg.seenBy.some((r) => r.recipientId.toString() === rId)
                                ) {
                                    seenByAll = false;
                                }
                            }
                        }
                        if (seenByAll) {
                            for (const sId of senderSockets) {
                                io.to(sId).emit("seen-messages", {
                                    msgs: updatedMsgs,
                                    chatId: activeChat._id
                                });
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error in chat-active socket handler:", err);
        }
    });

    // 5. Delete message broadcast
    socket.on("delete-message", async ({ senderId, msg, chatId, recipientIds }) => {
        for (const recipientId of recipientIds || []) {
            const recipientSockets = userManager.getSockets(recipientId);
            for (const sId of recipientSockets) {
                io.to(sId).emit("message-deleted", { msg, chatId });
            }
        }
    });

    // 6. Pin/unpin chat
    socket.on("pin-unpin-chat", () => {
        socket.emit("chat-pinned-unpinned");
    });

    // 7. Chat overview open
    socket.on("set-chat-overview-open", ({ chatId, onNewGroup }) => {
        socket.emit("open-chat-overview", { chatId, onNewGroup });
    });

    // 8. Notify new group created
    socket.on("notify-new-group-created", ({ chat }) => {
        if (!chat || !chat.participants) return;
        const createdBy = chat.group?.createdBy?.toString();
        const recipientIds = chat.participants.filter(
            (p) => (p._id ? p._id.toString() : p.toString()) !== createdBy
        );

        for (const recipientId of recipientIds) {
            const recipientSockets = userManager.getSockets(recipientId);
            for (const sId of recipientSockets) {
                io.to(sId).emit("added-in-group", { chat });
            }
        }
    });

    // 9. Disconnect
    socket.on("disconnect", async () => {
        const { userId, isLastSocket } = userManager.removeUser(socket.id);
        if (userId && isLastSocket) {
            const last = new Date();
            socket.broadcast.emit("user-offline", { userId, last });
            await User.findByIdAndUpdate(
                userId,
                { online: { is: false, last } },
                { new: true }
            );
            console.log("Client disconnected (user offline):", userId);
        }
    });
};

module.exports = registerSocketHandlers;
