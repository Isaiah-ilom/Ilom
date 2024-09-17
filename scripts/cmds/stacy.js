const axios = require('axios');
const rateLimit = new Map();
const description = "You are Stacy, an AI assistant created by Anthropic to be helpful, harmless, and honest.";

module.exports.config = {
  name: "stacy",
  aliases: ["stacy", "st", "chat"],
  hasPermission: 0,
  version: 1.3,
  credits: "lance x Raphael ilom, enhanced by [Raphael Scholar]",
  cooldowns: 2,
  usePrefix: false,
  description: "Chat with Stacy, an AI assistant",
  commandCategory: "AI",
  usages: "[question]"
};

const ANTHROPIC_API_KEY = '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';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/complete';

async function getAnthropicResponse(message) {
  try {
    const response = await axios.post(ANTHROPIC_API_URL, {
      prompt: `Human: ${message}\n\nAssistant: `,
      model: "claude-2",
      max_tokens_to_sample: 300,
      stop_sequences: ["\n\nHuman:"],
      temperature: 0.8,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ANTHROPIC_API_KEY,
      }
    });

    return response.data.completion.trim();
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    throw error;
  }
}

module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { messageID, threadID, senderID, body } = event;
  
  if (handleReply.author !== senderID) return;

  try {
    const response = await getAnthropicResponse(body);
    api.sendMessage(response, threadID, messageID);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    api.sendMessage("An error occurred while processing your request.", threadID, messageID);
  }
};

module.exports.run = async function ({ api, args, event }) {
  const { threadID, messageID, senderID } = event;
  const inp = args.join(' ');

  // Rate limiting
  if (rateLimit.has(senderID) && (Date.now() - rateLimit.get(senderID)) < 2000) {
    return api.sendMessage("Please wait a moment before sending another request.", threadID, messageID);
  }
  rateLimit.set(senderID, Date.now());

  if (!inp) {
    return api.sendMessage("Please provide a query.", threadID, messageID);
  }

  if (inp.toLowerCase() === 'help') {
    const helpMessage = `
      ** Command Help**
      - **stacy [question]**: Ask Stacy a question.
      - **stacy help**: Show this help message.
    `;
    api.sendMessage(helpMessage, threadID, messageID);
  } else {
    try {
      const response = await getAnthropicResponse(inp);
      api.sendMessage(response, threadID, (error, info) => {
        if (!error) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      api.sendMessage("An error occurred while processing your request.", threadID, messageID);
    }
  }
};
