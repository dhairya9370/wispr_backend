require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const cors = require("cors");
const mongoose = require("mongoose");
const atlas_url = process.env.ATLAS_DB_URL;
const Chat = require("./models/chats.js");
const Message = require("./models/messages.js");
const User = require("./models/users.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const { isLoggedIn } = require("./utils/authenticate.js");
const bodyParser = require("body-parser");
const { ObjectId } = mongoose.Types;
const cloudinary = require("cloudinary").v2;
const onlineUsers = new Map();
const helmet = require("helmet");

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Authorization"] ,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.options("*", cors());

app.use(bodyParser.json());


const store = MongoStore.create({
    mongoUrl: atlas_url,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 3 * 3600,
});
store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE");
})
app.use(session({
    store,
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    name: 'newSession',
    cookie: {
        maxAge: 1000 * 60 * 60 * 3,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Adjust based on environment
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain:'.onrender.com',
    }
}));
const multer = require('multer');
const { storage } = require("./utils/cloudConfig.js");
const upload = multer({ storage });

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.send("Wispr 2.0 BACKEND SERVER ON RENDER Frontend: https://wispr-frontend-tau.vercel.app");
});

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

async function isParticipantOf(participantId, chatId) {
    const { participants } = await Chat.findById(chatId, { participants: true });
    // console.log(participants);
    for (const id of participants) {
        if (id.toString() === participantId.toString()) {
            return true;
        }
    }
    return false;
}

async function main() {
    try {
        await mongoose.connect(atlas_url);
        console.log("✅ MongoDB connection Established");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        console.log("🔄 Retrying in 10s...");
        setTimeout(main, 10000);
    }
}
mongoose.connection.on("disconnected", () => {
    console.log("⚠️ MongoDB disconnected!");
});
mongoose.connection.on("error", (err) => {
    console.log(err);
})
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason?.message);
});
main()
    .then(() => {
        io.on("connection", (socket) => {
            socket.on("user-connect", async (userId) => {

                if (userId) {
                    onlineUsers.set(socket.id, userId);

                    const user = await User.findByIdAndUpdate(
                        userId,
                        { online: { is: true, last: new Date() } },
                        { new: true }
                    );
                    socket.emit("set-user-ui", { user });
                    socket.broadcast.emit("user-online", { userId });
                }
                console.log("new Client connected:", socket.id, onlineUsers.get(socket.id));
            });
            socket.on("start-backup", async (userId) => {

                const allChats = await Chat.find({ participants: userId }).populate("messages");
                if (allChats && allChats.length) {
                    socket.emit("backup-progress", 0);
                    let count = 0;
                    for (let i = 0; i < allChats.length; i++) {
                        for (let j = 0; j < allChats[i].messages.length; j++) {
                            const msg = allChats[i].messages[j];
                            const isDelivered =
                                msg.from.toString() !== userId.toString() &&
                                msg.deliveredTo.length > 0 &&
                                (msg.deliveredTo[0].recipientId?.toString() === userId.toString() ||
                                    msg.deliveredTo.some(entry => entry.recipientId?.toString() === userId.toString()));
                            if (!isDelivered) {
                                count++;
                            }
                        }
                    }
                    if (count === 0) {
                        socket.emit("backup-progress", 100);
                    } else {
                        const partition = count > 0 ? Math.floor(100 / count) : 100;
                        let currProgress = 0; let lastEmitted = 0;
                        for (let i = 0; i < allChats.length; i++) {
                            for (let j = 0; j < allChats[i].messages.length; j++) {
                                const msg = allChats[i].messages[j];
                                const isSent = msg.from.toString() === userId.toString();
                                const isDeliveredBySender = msg.deliveredTo.some(entry => (entry.recipientId?.toString() === userId.toString()));
                                // console.log(msg,isDelivered,isSent,msg.deliveredTo.some(entry => (entry.recipientId?.toString() === userId.toString())));
                                if (!isSent && !isDeliveredBySender) {
                                    const deliveredMsg = await Message.findByIdAndUpdate(msg._id, { $push: { deliveredTo: { recipientId: userId, at: new Date() } } }, { new: true });
                                    const senderSocketId = [...onlineUsers.entries()].find(([key, value]) => value.toString() === msg.from.toString())?.[0];
                                    if (senderSocketId) {
                                        io.to(senderSocketId).emit("message-delivered", deliveredMsg);
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
                    }
                    //now emit "message-delivered" to all the online senders 
                } else {
                    socket.emit("backup-progress", 100);
                }
            });
            socket.on("send-message", async ({ uuid, from, content, file, sentTo: { chatId, at } }) => {
                // console.log(msg);
                let newMsg = new Message({
                    from,
                    content,
                    file,
                    sentTo: {
                        chatId,
                        at,
                    }
                });
                let savedResult = await newMsg.save();
                let updatedChat = await Chat.findByIdAndUpdate(chatId, { $push: { messages: savedResult._id } }, { new: true });
                const recipients = updatedChat.participants.filter((p) => p.toString() !== from.toString());

                // console.log(savedResult,polledMsgResult);
                socket.emit("message-sent", { msg: savedResult, uuid });
                for (const [socketId, userId] of onlineUsers) {
                    if (userId.toString() !== savedResult.from.toString() && await isParticipantOf(userId, chatId)) {
                        const result = await Message.findById(savedResult._id);
                        if (!result.deliveredTo.some(recipient => (recipient.recipientId.toString() === userId.toString()))) {
                            const updatedMsg = await Message.findByIdAndUpdate(
                                savedResult._id,
                                { $push: { deliveredTo: { recipientId: userId, at: new Date() } } },
                                { new: true }
                            );
                            io.to(socketId).emit("received-message", updatedMsg);
                            let deliveredToAll = true;
                            for (const recipient of recipients) {
                                if (!updatedMsg.deliveredTo.some((r) => r.recipientId.toString() === recipient.toString())) {
                                    deliveredToAll = false;
                                }
                            }
                            if (deliveredToAll) {
                                socket.emit("message-delivered", updatedMsg);
                            }
                            // console.log(updatedMsg); 
                            //since recipiants who were online, got the message delivered by the sender itself, 
                            // no need to fetch individually by receiver if online
                            //hence update msgList/lastMsg increament the unseen messages of the user if this ChatWindow not active
                            // now check if the receiver's chatWindow is active for this chat or not to update the status of seen
                        }
                    }
                }
            });
            socket.on("chat-active", async ({ activeChat }) => {
                //jo msg.from hai , uske saare msgs 'seen' kardo
                const receiverId = onlineUsers.get(socket.id)?.toString();
                if (!receiverId || !activeChat || !activeChat.participants) return;
                for (const participant of activeChat.participants) {
                    if (participant._id.toString() !== receiverId) {
                        const senderSocketId = [...onlineUsers.entries()].find(([key, value]) => value.toString() === participant._id.toString())?.[0];
                        const { messages } = await Chat.findById(activeChat._id, { messages: 1 }).populate("messages");
                        let updatedMsgs = [];
                        if (messages && messages.length > 0) {
                            for (let message of messages) {
                                if (message.from.toString() === participant._id.toString()) {
                                    if (message.deliveredTo.some((el) => (el.recipientId.toString() === receiverId))
                                        && !message.seenBy.some((el) => (el.recipientId.toString() === receiverId))) {
                                        const updatedMsg = await Message.findByIdAndUpdate(message._id, {
                                            $push: {
                                                seenBy: {
                                                    recipientId: receiverId,
                                                    at: new Date()
                                                }
                                            }
                                        },
                                            { new: true });
                                        updatedMsgs.push(updatedMsg);
                                    }
                                }
                            }
                        }
                        if (senderSocketId && updatedMsgs.length > 0) {
                            let seenByAll = true;
                            for (const msg of updatedMsgs) {
                                for (const recipient of activeChat.participants) {
                                    if (msg.from.toString() !== recipient._id.toString() &&
                                        !msg.seenBy.some((r) =>
                                            r.recipientId.toString() === recipient._id.toString())
                                    ) {
                                        seenByAll = false;
                                    }
                                }
                            }
                            if (seenByAll) {
                                io.to(senderSocketId).emit("seen-messages",
                                    { msgs: updatedMsgs, chatId: activeChat._id }
                                );
                            }
                        }
                    }
                }

            });
            socket.on("delete-message", async ({ senderId, msg, chatId, recipientIds }) => {
                console.log(recipientIds);
                for (const recipientId of recipientIds) {
                    const recipientSocketId = [...onlineUsers.entries()].find(([key, value]) =>
                        value.toString() === recipientId.toString())?.[0];
                    console.log(recipientId, recipientSocketId);

                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("message-deleted", { msg, chatId });
                    }
                }
            });
            socket.on("pin-unpin-chat", () => {
                socket.emit("chat-pinned-unpinned");
            });
            socket.on("set-chat-overview-open", ({ chatId, onNewGroup }) => {
                // console.log("emmited open");
                socket.emit("open-chat-overview", { chatId, onNewGroup });
            });
            socket.on("notify-new-group-created", ({ chat }) => {
                const recipientIds = chat.participants.filter((p) => p.toString() !== chat.group.createdBy.toString());
                // console.log(recipientIds,chat.participants);

                for (const recipientId of recipientIds) {

                    const recipientSocketId = [...onlineUsers.entries()].find(([key, value]) =>
                        value.toString() === recipientId.toString())?.[0];

                    // console.log(recipientId,recipientSocketId);

                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("added-in-group", { chat });
                    }
                }
            });
            socket.on("disconnect", async () => {
                const userId = onlineUsers.get(socket.id);
                if (userId) {
                    socket.broadcast.emit("user-offline", { userId, last: new Date() });
                    await User.findByIdAndUpdate(
                        userId,
                        { online: { is: false, last: new Date() } },
                        { new: true }
                    );
                    onlineUsers.delete(socket.id);
                    console.log("Client disconnected:", userId);
                }
            });
        });
        const PORT = process.env.PORT;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Wispr on port ${PORT}`);
        });
    });


// app.use((req, res, next) => {
//     res.locals.currentUser = req.user;
//     // console.log(res.locals.currentUser)
//     next();
// });

//push this logic to the socket send-message, or update the msg doc after upload
app.post("/upload", isLoggedIn, upload.single("file"), async (req, res) => {
    // Handle request abort
    req.on("aborted", () => {
        console.error("❌ Request was aborted by the client.");
    });
    try {

        if (!req.file || typeof req.file !== "object") {
            return res.status(400).json({ message: "No file received or invalid format" });
        }
        // console.log(req.file);

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
});

// app.post("/login", (req, res, next) => {
//     console.log("Login attempt :",req.body);
//     passport.authenticate("local", (err, user, info) => {
//         if (err) return next(err);
//         // console.log(user, info);
//         if (!user) return res.status(401).json({ message: "Invalid credentials" });

//         req.logIn(user, (err) => {
//             if (err) return next(err);
//             return res.json({ message: "Login successful", user });
//         });
//     })(req, res, next);
// });
app.post("/login", (req, res, next) => {
    console.log("Login attempt:", req.body);
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Authentication error:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Authentication error" 
            });
        }
        
        if (!user) {
            console.log("Authentication failed:", info);
            return res.status(401).json({ 
                success: false, 
                message: info?.message || "Invalid credentials" 
            });
        }

        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error("Login error:", loginErr);
                return res.status(500).json({ 
                    success: false, 
                    message: "Login failed" 
                });
            }
            
            console.log("Login successful for user:", user.username);
            
            // Return user data without sensitive information
            const userResponse = {
                _id: user._id,
                username: user.username,
                email: user.email
                // Add other non-sensitive fields you need
            };
            
            res.json({ 
                success: true, 
                message: "Login successful",
                user: userResponse
            });
        });
    })(req, res, next);
});

app.post("/logout", isLoggedIn, (req, res) => {
    req.logout(() => {
        req.session.destroy();
        res.json({ message: "Logged out" });
    });
});

app.post("/api/register", (req, res) => {
    const { id, email, password } = req.body;
    const newUser = new User({
        username: id.toUpperCase(),
        email,
        name: id.toUpperCase(),
        collegeId: "IIITN"
    });

    User.register(newUser, password.toString(), (err, user) => {
        if (err) {
            console.error("Register Error:", err);
            return res.status(500).json({ message: "Registration Failed", error: err.message });
        }
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error("Login after register failed:", loginErr);
                return res.status(500).json({ message: "Login Failed", error: loginErr.message });
            }
            res.json({ message: "Registered and logged in", user });
        });
    });
});

app.post("/api/setup-profile", isLoggedIn, async (req, res) => {
    try {
        const { id, formData } = req.body;

        if (!id || !formData) {
            return res.status(400).json({ message: "Missing Credentials" });
        }
        const { dp, theme, name, wallpaper, language } = formData;
        const updateFields = {};
        if (name?.trim()) updateFields.name = name;
        if (dp?.trim()) updateFields["ui.dp"] = dp;
        if (theme?.trim()) updateFields["ui.background"] = theme;
        if (wallpaper?.trim()) updateFields["ui.wallpaper"] = wallpaper;
        if (language?.trim()) updateFields["ui.language"] = language;
        // console.log(id,updateFields);

        const result = await User.findByIdAndUpdate(id.toString(), {
            $set: updateFields
        }, { new: true });

        return res.status(200).json({ message: "Profile updated", user: result });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
});

app.get("/:id/chats", async (req, res) => {
    const { id, chatId } = req.params;
    // console.log(id);

});
app.get("/:id/chats/:chatId", async (req, res) => {
    const { id, chatId } = req.params;
    // console.log(id);
    if (id) {
        const chatList = await Chat.find({
            participants: new mongoose.Types.ObjectId(id)
        }).populate("participants").populate("messages");

    }
});
app.post("/api/get-all-chats", isLoggedIn, async (req, res) => {
    const { userId } = req.body;
    let result;
    if (userId) {
        const chatList = await Chat.find({
            participants: userId
        }).populate("participants").populate("messages");
        res.json({ chatList });
        // result=await chatList.json();
        // console.log(chatList);
    }
});
app.post("/api/get-active-chat", isLoggedIn, async (req, res) => {
    const { chatId } = req.body;
    // console.log(chatId);
    if (chatId) {
        const activeChat = await Chat.findById(chatId).populate("messages").populate("participants");
        res.json({ activeChat });
        // console.log(activeChat);
    }
});
app.post("/api/get-chat-list", async (req, res) => {
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
        });

        const filteredResult = result.filter(
            user => user?._id.toString() !== userId.toString()
        );

        res.status(200).json(filteredResult);
    } catch (err) {
        res.status(400).json({ message: err.message || "Failed To Fetch user" });
    }
});

app.post("/api/user-status", isLoggedIn, async (req, res) => {
    const { recipientId } = req.body;
    const result = await User.findById(recipientId, { online: 1, _id: 0 });
    res.json(result);
});
app.post("/api/online-participants", isLoggedIn, async (req, res) => {
    const { recipients } = req.body;
    const result = await User.find({ _id: { $in: recipients }, "online.is": true }, { _id: 1 });
    const online = result.map((id) => id._id);
    res.json(result);
});
app.post("/api/create-new-chat", async (req, res) => {
    const { participants } = req.body;
    // console.log(participants);
    try {
        const result = await Chat.find({
            participants: { $all: participants },
            $expr: { $eq: [{ $size: "$participants" }, 2] }
        });
        if (result.length) {
            res.status(200).json({ message: "Chat Already Exists", chat: result[0] });
        } else {
            const newChat = new Chat({ participants });
            const savedChat = await newChat.save();
            console.log(savedChat);
            res.status(200).json({ message: "Created Chat Successfully", chat: savedChat });
        }
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message || "Failed To Create Chat" });
    }
});
app.post("/api/create-group", async (req, res) => {
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
        res.status(200).json({ message: "Created Group Successfully", group: savedGroup });
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message || "Failed To Create Group" });
    }
});
app.post("/api/update-group", async (req, res) => {
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
        res.status(200).json({ message: "Updated Group Successfully", chat: savedGroup });
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message || "Failed To Update Group" });
    }
});
const deleteFromCloudinary = async (url) => {
    try {
        const parts = url.split('/');

        // Find the index of 'upload'
        const uploadIndex = parts.indexOf('upload');

        // Skip 'upload' and the version folder (starts with 'v' followed by digits)
        const publicIdParts = parts.slice(uploadIndex + 1).filter(p => !/^v\d+$/.test(p));

        // Remove file extension
        const filename = publicIdParts.pop(); // e.g., '1753595503043-Report.pdf'
        const baseFilename = filename.split('.')[0]; // e.g., '1753595503043-Report'

        const publicId = [...publicIdParts, baseFilename].join('/');

        // Try to delete with different resource types
        const resourceTypes = ['image', 'video', 'raw'];

        for (const type of resourceTypes) {
            try {
                const result = await cloudinary.uploader.destroy(publicId, { resource_type: type, timeout: 60000 });
                if (result.result === 'ok') {
                    console.log("✅ Deleted:", publicId, "as", type);
                    return result;
                }
            } catch (err) {
                // If it's a 404 or "not found", try next resource type
                if (err.http_code === 404 || err.message?.includes('not found')) {
                    continue;
                }
                // Other error, rethrow
                throw err;
            }
        }

        console.log("⚠️ File not found in any resource type:", publicId);
        return { result: 'not found' };
    } catch (err) {
        console.error("❌ Cloudinary deletion failed:", err);
        throw err;
    }
};
app.post("/api/delete-message", isLoggedIn, async (req, res) => {
    const { msg } = req.body;
    // console.log(msg);
    try {
        let result2 = "";
        if (msg.file?.url) {
            result2 = await deleteFromCloudinary(msg.file.url)
        }
        const result1 = await Chat.updateOne(
            { _id: msg.sentTo?.chatId },
            { $pull: { messages: msg._id } }
        );

        const result3 = await Message.findByIdAndDelete(msg._id)
        res.status(200).json({ message: "Deleted Successfully" });
    } catch (err) {
        return res.status(500).json({ message: "Failed to Delete Message" });
    }

});

app.post("/api/delete-file", async (req, res) => {
    try {
        const result2 = await deleteFromCloudinary(req.body.fileUrl);
        res.status(200).json({ message: "deleted file successfully" });
    } catch (err) {
        res.status(400).json({ message: err })
    }
})
app.post("/api/delete-all-messages", async (req, res) => {
    // const { id } = req.body;
    try {
        // const messagesToDelete = await Message.find({ from: id }, { _id: 1, file: 1 });
        // await Message.deleteMany({ from: id });
        // const result1 = await Chat.updateMany(
        //     { _id: msg.sentTo?.chatId },
        //     { $pull: { messages: msg._id } }
        // );
        // for(const msg of messagesToDelete){
        // if(msg.file){await  deleteFromCloudinary(msg.file.url)}}

        res.json({ message: "Deleted All Messages and Files Virtually" });
    } catch (err) {
        res.status(400).json({ message: "Error in deleting Messages" })
    }
});
app.post("/api/delete-all-chats", async (req, res) => {
    // const { id } = req.body;
    try {
        // const messagesToDelete = await Chat.find({ from: id }, { _id: 1, file: 1 });
        res.json({ message: "Deleted All Chats and Files Virtually" })
    } catch (err) {
        res.status(400).json({ message: "Error in deleting Chats" })
    }
});
app.post("/api/set-pinned-chats", async (req, res) => {
    try {
        const { userId, chatId } = req.body;
        console.log(userId, chatId);
        const result = await User.findByIdAndUpdate(
            userId,
            { $push: { "ui.pinned": chatId } },
            { new: true }
        );

        res.status(200).json({ message: "Pinned Successfully", user: result });
    } catch (err) {
        res.status(400).json({ message: "Error in pinnig Chat" })
    }
});
app.post("/api/set-chat-unpinned", async (req, res) => {
    try {
        const { userId, chatId } = req.body;
        console.log(userId, chatId);
        const result = await User.findByIdAndUpdate(
            userId,
            { $pull: { "ui.pinned": chatId } },
            { new: true }
        );
        res.status(200).json({ message: "Unpinned Successfully", user: result });
    } catch (err) {
        res.status(400).json({ message: "Error in Unpinnig Chat" })
    }
});

app.post('/api/get-all-users', async (req, res) => {
    try {
        const userList = await User.find({});
        res.status(200).json(userList);
    } catch (err) {
        res.status(400).json({ message: "Error in Fetching User List" })
    }
});
app.post("/api/get-user", async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        res.status(200).json(user);
    } catch (err) {
        res.status(400).json({ message: "Error in Fetching User" })
    }
});




