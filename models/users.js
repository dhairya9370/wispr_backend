const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const Chat = require("./chats");
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    collegeId: {
        type: String,
        required: true, 
        trim: true,
        set: (value) => value.toUpperCase()
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    ui: {
        dp: {
            type: String,
            default: "https://res.cloudinary.com/dgmbfhpbw/image/upload/v1752080525/115-1150152_default-profile-picture-avatar-png-green_b26ctx.png",
        },
        pinned: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Chat"
            }],
            maxlength: [3, 'Cannot have more than 3 pinned chats'],
            default: []
        },
        background: {
            type: String,
            default: "#ffffff"
        },
        wallpaper: {
            type: String,
            default: "https://res.cloudinary.com/dgmbfhpbw/image/upload/v1753376224/chatBackground_wbq79v_xfanlt.jpg"
        },
        language: {
            type: String,
            default: "english"
        },
    },
    online: {
        is: { 
            type: Boolean, 
            default: false 
        },
        last: {
            type: Date,
            default: Date.now
        },
    }
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);
module.exports = User;
