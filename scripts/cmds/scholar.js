const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getGPTResponse(prompt, maxTokens = 150) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };
  const data = {
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching GPT-4 response:', error.response ? error.response.data : error.message);
    return 'Sorry, I couldn\'t process your request at the moment.';
  }
}

function logInteraction(user, prompt, response, responseTime) {
  const logPath = path.join(__dirname, 'interaction_logs.txt');
  const logEntry = `User: ${user}\nPrompt: ${prompt}\nResponse: ${response}\nResponse Time: ${responseTime}ms\nTimestamp: ${new Date().toISOString()}\n\n`;

  fs.appendFile(logPath, logEntry, (err) => {
    if (err) console.error('Error logging interaction:', err);
  });
}

module.exports = {
  config: {
    name: 'scholar',
    author: 'Raphael Ilom',
    role: 0,
    category: 'intelligence',
    shortDescription: 'Get intelligent responses from GPT-4',
    longDescription: 'Interact with GPT-4 to get intelligent and context-aware responses. Supports customizable response length and logs interactions for future improvements.',
  },
  onStart: async function ({ api, event, args }) {
    try {
      const prompt = args.slice(0, -1).join(' ');
      const maxTokens = parseInt(args[args.length - 1], 10) || 150;

      if (!prompt) {
        api.sendMessage('Please provide a prompt for GPT-4.', event.threadID, event.messageID);
        return;
      }

      const startTime = Date.now();
      const gptResponse = await getGPTResponse(prompt, maxTokens);
      const responseTime = Date.now() - startTime;

      api.sendMessage(gptResponse, event.threadID, event.messageID);

      // Log the interaction
      logInteraction(event.senderID, prompt, gptResponse, responseTime);

      // Ask for user feedback
      api.sendMessage('Was this response helpful? Reply with "yes" or "no".', event.threadID, event.messageID);

      // Listen for feedback
      api.listen((feedbackEvent) => {
        if (feedbackEvent.body.toLowerCase() === 'yes' || feedbackEvent.body.toLowerCase() === 'no') {
          const feedback = feedbackEvent.body.toLowerCase();
          const feedbackLogEntry = `User: ${feedbackEvent.senderID}\nFeedback: ${feedback}\nTimestamp: ${new Date().toISOString()}\n\n`;

          fs.appendFile(logPath, feedbackLogEntry, (err) => {
            if (err) console.error('Error logging feedback:', err);
          });

          api.sendMessage('Thank you for your feedback!', feedbackEvent.threadID, feedbackEvent.messageID);
        }
      });
    } catch (error) {
      console.error('Error in onStart function:', error);
      api.sendMessage('An error occurred while processing your request.', event.threadID, event.messageID);
    }
  }
};
