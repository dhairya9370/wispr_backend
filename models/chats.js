const mongoose=require("mongoose");
const User=require("./users");
const Message=require("./messages");
const chatSchema= new mongoose.Schema({
    isGroup:{
        type:Boolean,
        default:false
    },
    group:{
        name:String,
        dp:{
            type:String,
            default:"https://res.cloudinary.com/dgmbfhpbw/image/upload/v1755927713/group-dp_h6qf6c.png"
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        createdAt:Date,
        admins:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"User"
            }
        ]
    },
    participants:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
    ],
    messages:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"Message",
        },
    ],
    lastActive:{
        type:Date,
        default:Date.now,
    },
});
const Chat= mongoose.model("Chat",chatSchema);
module.exports=Chat;
