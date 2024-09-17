const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const prefix = '-'; // Change this to your bot's prefix

app.use(bodyParser.json());

async function spamMessage(sender, message, count, interval, sendMessage) {
  for (let i = 0; i < count; i++) {
    await sendMessage(sender, { text: message });
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

app.post('/webhook', async (req, res) => {
  const { message, sender } = req.body;

  if (message.startsWith(prefix)) {
    const args = message.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'spam') {
      const spamMessageText = args.join(' ');
      const count = parseInt(args[1], 10) || 5; // Default to 5 messages
      const interval = parseInt(args[2], 10) || 1000; // Default to 1 second

      await spamMessage(sender, spamMessageText, count, interval, sendMessage);
    }
  }

  res.sendStatus(200);
});

function sendMessage(sender, message) {
  // Replace with your Messenger API call
  console.log(`Sending message to ${sender}:`, message);
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Module configuration
module.exports = {
  config: {
    name: "spam",
    aliases: [],
    version: "1.0",
    author: "Raphael scholar",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "Gửi tin nhắn spam",
      en: "Send spam messages"
    },
    longDescription: {
      vi: "Gửi tin nhắn spam nhiều lần với khoảng thời gian nhất định",
      en: "Send spam messages multiple times with a specified interval"
    },
    category: "utility",
    guide: {
      vi: "{pn} <tin nhắn> <số lần> <khoảng thời gian>",
      en: "{pn} <message> <count> <interval>"
    }
  },
  langs: {
    vi: {
      null: "Không có dữ liệu"
    },
    en: {
      null: "No data available"
    }
  }
};
