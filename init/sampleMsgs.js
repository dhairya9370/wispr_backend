const { ObjectId } = require("mongodb");

const messages = [];

// Helper to create ISO date
const createDate = (day, hour = 12) =>
  new Date(`2025-07-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:39:36.660Z`);

const fromId =new ObjectId("686fb4202e6f0ea380a0703c");
const toId =new ObjectId("686fb4202e6f0ea380a0703d");
const chatId =new ObjectId("686ab1a119c64c89320ea6ed");

const baseContents = [
  "Hey, what's up?",
  "All good here, how about you?",
  "Let's meet at 5 PM",
  "Sure, see you then.",
  "Don't forget the files."
];

[6, 7, 9, 10].forEach((day) => {
  baseContents.forEach((content, i) => {
    const isFromA = i % 2 === 0;
    const from = isFromA ? fromId : toId;
    const recipient = isFromA ? toId : fromId;
    const date = createDate(day, 12 + i);

    messages.push({
      content,
      from,
      sentTo: {
        chatId,
        at: date
      },
      deliveredTo: [{
        recipientId: recipient,
        at: date
      }],
      seenBy: i % 3 === 0 ? [{
        recipientId: recipient,
        at: new Date(date.getTime() + 60_000)
      }] : [],
      __v: 0
    });
  });
});

module.exports = messages;
