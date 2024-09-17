const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const scholar = require('./commands/scholar');

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  try {
    const event = req.body.entry[0].messaging[0];
    const args = event.message.text.split(' ');

    if (args[0].toLowerCase() === 'scholar') {
      scholar.onStart({ api: { sendMessage, listen }, event, args: args.slice(1) });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.sendStatus(500);
  }
});

function sendMessage(message, threadID, messageID) {
  // Implement your sendMessage logic here
  console.log(`Sending message to ${threadID}: ${message}`);
}

function listen(callback) {
  // Implement your listen logic here
  console.log('Listening for feedback...');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
