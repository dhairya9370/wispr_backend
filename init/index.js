require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/users.js");
const Chat = require("../models/chats.js");
const Message = require("../models/messages.js");
const atlas_url = process.env.ATLAS_DB_URL;
const { ObjectId } = mongoose.Types;
async function main() {
  await mongoose.connect(atlas_url);
}
main()
  .then(() => {
    console.log("MongoDB Connection Established");
  })
  .catch((err) => {
    console.log(err);
  });
const messages= require("./sampleMsgs.js");
const init = async () => {
  // await User.deleteMany({});
  // await Chat.deleteMany({});
  // await Message.deleteMany({});
  // const allMsgIds=await Message.find({});
  // const result = await Chat.findOneAndUpdate({_id:new ObjectId("686ab1a119c64c89320ea6ed")},{$set:{messages: allMsgIds}})
  // console.log(result);
  // await User.insertMany(sampleUsers);
  // await Chat.insertOne(sampleChats);
  // await Message.insertMany(messages);
  await Chat.findByIdAndUpdate("686ab1a119c64c89320ea6ed", { messages: msgs });

}
const sampleUsers = [
  {
    username: "BT24CSE070",
    name: "Dhairya Singhal",
    collegeId: "IIITN",
    email: "bt24cse070@gmail.com",
    password: "70",
    ui: {
      dp: "https://res.cloudinary.com/dgmbfhpbw/image/upload/v1751809472/4721eea8-03cf-4935-aa3d-0e74bdd2d034_yk8vwn.jpg",
      background: "rgb(236, 255, 207)",
      wallpaper: "https://res.cloudinary.com/dgmbfhpbw/image/upload/v1751809813/chatBackground_wbq79v.jpg",
    }
  },
  {
    username: "BT24CSE000",
    name: "Wispr Admin",
    collegeId: "IIITN",
    email: "bt24cse000@gmail.com",
    password: "00",
    ui: {
      dp: "https://res.cloudinary.com/dgmbfhpbw/image/upload/v1751809567/worker-employee-businessman-avatar-profile-icon-vector_xjowpf.jpg",
      background: "rgb(51, 51, 51)",
      wallpaper: "https://res.cloudinary.com/dgmbfhpbw/image/upload/v1751809831/darkChatBackground_tsaakk.png",
    }
  }
]
const sampleChats = {
  isGroup: false,
  participants: [
    new ObjectId("686a90e866256fe8f9db2cf1"),
    new ObjectId("686a90e866256fe8f9db2cf2"),
  ]
};
const msgs=[
  "6873b583af44fa95e980a751",
  "6873b583af44fa95e980a752",
  "6873b583af44fa95e980a753",
  "6873b583af44fa95e980a754",
  "6873b583af44fa95e980a755",
  "6873b583af44fa95e980a756",
  "6873b583af44fa95e980a757",
  "6873b583af44fa95e980a758",
  "6873b583af44fa95e980a759",
  "6873b583af44fa95e980a75a",
  "6873b583af44fa95e980a75b",
  "6873b583af44fa95e980a75c",
  "6873b583af44fa95e980a75d",
  "6873b583af44fa95e980a75e",
  "6873b583af44fa95e980a75f",
  "6873b583af44fa95e980a760",
  "6873b583af44fa95e980a761",
  "6873b583af44fa95e980a762",
  "6873b583af44fa95e980a763",
  "6873b583af44fa95e980a764",
  "6873b583af44fa95e980a765",
  "6873b583af44fa95e980a766",
  "6873b583af44fa95e980a767",
  "6873b583af44fa95e980a768",
  "6873b583af44fa95e980a769",
  "6873b583af44fa95e980a76a",
  "6873b583af44fa95e980a76b",
  "6873b583af44fa95e980a76c",
  "6873b583af44fa95e980a76d",
  "6873b583af44fa95e980a76e",
  "6873b583af44fa95e980a76f",
  "6873b583af44fa95e980a770",
  "6873b583af44fa95e980a771",
  "6873b583af44fa95e980a772",
  "6873b583af44fa95e980a773",
  "6873b583af44fa95e980a774",
  "6873b583af44fa95e980a775",
  "6873b583af44fa95e980a776",
  "6873b583af44fa95e980a777"
];

init();