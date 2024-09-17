const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyDexXPq3VSDwWSfzfnONTEKStfs42sTRIY';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_HISTORY = 10;
const AUTHORIZED_AUTHOR = 'Raphael Scholar';
const USER_DATA_FILE = path.join(__dirname, 'userData.json');
const CONVERSATION_EXPIRY = 30 * 60 * 1000; // 30 minutes

let userData = {};
if (fs.existsSync(USER_DATA_FILE)) {
  userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
}

async function geminiAPI(prompt, userId, retries = 0) {
  try {
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      contents: [{ parts: [{ text: prompt }] }]
    }, {
      params: { key: GEMINI_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error in geminiAPI:', error);
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return geminiAPI(prompt, userId, retries + 1);
    }
    return "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later.";
  }
}

async function getAIResponse(input, userId) {
  const userProfile = getUserProfile(userId);
  const context = userProfile.history.join('\n');
  const fullPrompt = `${context}\nUser: ${input}\nAI:`;
  const response = await geminiAPI(fullPrompt, userId);
  addUserMessageToHistory(userId, `User: ${input}\nAI: ${response}`);
  return response;
}

function saveUserData() {
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData, null, 2));
}

function getUserProfile(userId) {
  if (!userData[userId]) {
    userData[userId] = { preferences: {}, history: [], lastInteraction: Date.now() };
  }
  return userData[userId];
}

function addUserMessageToHistory(userId, message) {
  const profile = getUserProfile(userId);
  profile.history.push(message);
  if (profile.history.length > MAX_HISTORY) {
    profile.history.shift();
  }
  profile.lastInteraction = Date.now();
  saveUserData();
}

function getGreetingMessage(userId) {
  const hours = new Date().getHours();
  let greeting = hours < 12 ? "Good morning!" : hours < 18 ? "Good afternoon!" : "Good evening!";
  const profile = getUserProfile(userId);
  greeting += profile.preferences.name ? ` 😊 I'm Lea, your AI assistant created by Raphael Scholar. How can I help you today, ${profile.preferences.name}?` : " 😊 I'm Lea, your AI assistant created by Raphael Scholar. How can I help you today?";
  return greeting;
}

function clearExpiredConversations() {
  const now = Date.now();
  for (const userId in userData) {
    if (now - userData[userId].lastInteraction > CONVERSATION_EXPIRY) {
      userData[userId].history = [];
    }
  }
  saveUserData();
}

setInterval(clearExpiredConversations, 60 * 60 * 1000); // Run every hour

module.exports = {
  config: {
    name: 'lea',
    description: "Interact with Lea, an AI assistant powered by Gemini",
    usage: "{prefix}lea <message>",
    cooldown: 3,
    permissions: [0, 1, 2],
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID, messageID } = event;
    const input = args.join(' ');

    if (!input) {
      return message.reply(getGreetingMessage(senderID));
    }

    if (input.toLowerCase() === 'clear history') {
      clearUserHistory(senderID);
      return message.reply("Your conversation history has been cleared.");
    }

    if (input.toLowerCase().startsWith('set name')) {
      const name = input.slice(9).trim();
      setUserPreference(senderID, 'name', name);
      return message.reply(`Great! I'll remember your name as ${name}.`);
    }

    const aiResponse = await getAIResponse(input, senderID);
    return message.reply(aiResponse);
  },

  onChat: async function ({ api, event, message }) {
    const { threadID, senderID, messageID, body } = event;

    if (body.toLowerCase().startsWith('lea')) {
      const input = body.slice(3).trim();
      if (!input) {
        return message.reply(getGreetingMessage(senderID));
      }
      const aiResponse = await getAIResponse(input, senderID);
      return message.reply(aiResponse);
    }
  }
};

function clearUserHistory(userId) {
  const profile = getUserProfile(userId);
  profile.history = [];
  saveUserData();
}

function setUserPreference(userId, key, value) {
  const profile = getUserProfile(userId);
  profile.preferences[key] = value;
  saveUserData();
}

function generatePersonalizedResponse(userId, response) {
  const profile = getUserProfile(userId);
  if (profile.preferences.name) {
    response = response.replace(/\b(you|user)\b/gi, profile.preferences.name);
  }
  return response;
}

async function getAIResponse(input, userId) {
  const userProfile = getUserProfile(userId);
  const context = userProfile.history.join('\n');
  const fullPrompt = `${context}\nUser: ${input}\nAI:`;
  let response = await geminiAPI(fullPrompt, userId);
  response = generatePersonalizedResponse(userId, response);
  addUserMessageToHistory(userId, `User: ${input}\nAI: ${response}`);
  return response;
}

function isAuthorized(userId) {
  // Implement your authorization logic here
  return true; // For now, everyone is authorized
}

async function geminiAPI(prompt, userId, retries = 0) {
  if (!isAuthorized(userId)) {
    return "I'm sorry, but you're not authorized to use this service.";
  }

  try {
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    }, {
      params: { key: GEMINI_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error in geminiAPI:', error);
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return geminiAPI(prompt, userId, retries + 1);
    }
    return "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later.";
  }
}

// New feature: Sentiment analysis
async function analyzeSentiment(text) {
  // This is a placeholder. In a real implementation, you'd use a sentiment analysis API or library
  const sentiment = text.toLowerCase().includes('happy') ? 'positive' : 
                    text.toLowerCase().includes('sad') ? 'negative' : 'neutral';
  return sentiment;
}

// New feature: Language detection
async function detectLanguage(text) {
  // This is a placeholder. In a real implementation, you'd use a language detection API or library
  return 'en'; // Assuming English for now
}

// Enhanced getAIResponse function
async function getAIResponse(input, userId) {
  const userProfile = getUserProfile(userId);
  const context = userProfile.history.join('\n');
  const sentiment = await analyzeSentiment(input);
  const language = await detectLanguage(input);
  
  const fullPrompt = `
    Context: ${context}
    User Input: ${input}
    Detected Sentiment: ${sentiment}
    Detected Language: ${language}
    
    Please provide a response that takes into account the user's sentiment and language.
    AI:`;
  
  let response = await geminiAPI(fullPrompt, userId);
  response = generatePersonalizedResponse(userId, response);
  addUserMessageToHistory(userId, `User: ${input}\nAI: ${response}`);
  return response;
}

// New feature: Command handler
function handleCommand(command, args, userId) {
  switch (command) {
    case 'clear':
      clearUserHistory(userId);
      return "Your conversation history has been cleared.";
    case 'setname':
      const name = args.join(' ');
      setUserPreference(userId, 'name', name);
      return `Great! I'll remember your name as ${name}.`;
    case 'help':
      return `
        Available commands:
        - clear: Clear your conversation history
        - setname <name>: Set your name
        - help: Show this help message
      `;
    default:
      return null;
  }
}

// Enhanced onStart function
onStart: async function ({ api, event, args, message }) {
  const { threadID, senderID, messageID } = event;
  const input = args.join(' ');

  if (!input) {
    return message.reply(getGreetingMessage(senderID));
  }

  if (input.startsWith('!')) {
    const [command, ...commandArgs] = input.slice(1).split(' ');
    const result = handleCommand(command, commandArgs, senderID);
    if (result) {
      return message.reply(result);
    }
  }

  const aiResponse = await getAIResponse(input, senderID);
  return message.reply(aiResponse);
},

// New feature: Periodic tips
function sendPeriodicTip(api, threadID) {
  const tips = [
    "Did you know you can clear your conversation history by typing '!clear'?",
    "You can set your name using the '!setname' command for a more personalized experience!",
    "Type '!help' to see all available commands.",
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  api.sendMessage(randomTip, threadID);
}

setInterval(() => {
  for (const threadID in userData) {
    sendPeriodicTip(api, threadID);
  }
}, 24 * 60 * 60 * 1000); // Send tips every 24 hours

// New feature: User feedback
function handleUserFeedback(feedback, userId) {
  const profile = getUserProfile(userId);
  if (!profile.feedback) {
    profile.feedback = [];
  }
  profile.feedback.push(feedback);
  saveUserData();
  return "Thank you for your feedback! We appreciate your input to help improve our service.";
}

// New feature: Conversation summarization
async function summarizeConversation(userId) {
  const profile = getUserProfile(userId);
  const conversation = profile.history.join('\n');
  const summary = await geminiAPI(`Please summarize the following conversation:\n${conversation}`, userId);
  return summary;
}

// Enhanced onStart function
onStart: async function ({ api, event, args, message }) {
  const { threadID, senderID, messageID } = event;
  const input = args.join(' ');

  if (!input) {
    return message.reply(getGreetingMessage(senderID));
  }

  if (input.startsWith('!')) {
    const [command, ...commandArgs] = input.slice(1).split(' ');
    switch (command) {
      case 'clear':
      case 'setname':
      case 'help':
        const result = handleCommand(command, commandArgs, senderID);
        return message.reply(result);
      case 'feedback':
        const feedback = commandArgs.join(' ');
        return message.reply(handleUserFeedback(feedback, senderID));
      case 'summary':
        const summary = await summarizeConversation(senderID);
        return message.reply(`Here's a summary of our conversation:\n${summary}`);
      default:
        return message.reply("Unknown command. Type '!help' for a list of available commands.");
    }
  }

  const aiResponse = await getAIResponse(input, senderID);
  return message.reply(aiResponse);
},

// New feature: Error handling and logging
function logError(error, context) {
  console.error(`Error in ${context}:`, error);
  // In a production environment, you might want to log this to a file or external service
}

// Enhance geminiAPI function with better error handling
async function geminiAPI(prompt, userId, retries = 0) {
  if (!isAuthorized(userId)) {
    return "I'm sorry, but you're not authorized to use this service.";
  }

  try {
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    }, {
      params: { key: GEMINI_API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    logError(error, 'geminiAPI');
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return geminiAPI(prompt, userId, retries + 1);
    }
    return "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later.";
  }
}

// New feature: User engagement tracking
function trackUserEngagement(userId, action) {
  const profile = getUserProfile(userId);
  if (!profile.engagement) {
    profile.engagement = { interactions: 0, lastActive: null };
  }
  profile.engagement.interactions++;
  profile.engagement.lastActive = Date.now();
  saveUserData();
}

// New feature: Personalized recommendations
async function getPersonalizedRecommendation(userId) {
  const profile = getUserProfile(userId);
  const interests = profile.preferences.interests || [];
  const prompt = `Based on the user's interests: ${interests.join(', ')}, please provide a personalized recommendation for an activity or topic they might enjoy.`;
  return await geminiAPI(prompt, userId);
}

// Enhanced onStart function with new features
onStart: async function ({ api, event, args, message }) {
  const { threadID, senderID, messageID } = event;
  const input = args.join(' ');

  trackUserEngagement(senderID, 'command');

  if (!input) {
    return message.reply(getGreetingMessage(senderID));
  }

  if (input.startsWith('!')) {
    const [command, ...commandArgs] = input.slice(1).split(' ');
    switch (command) {
      case 'clear':
      case 'setname':
      case 'help':
        const result = handleCommand(command, commandArgs, senderID);
        return message.reply(result);
      case 'feedback':
        const feedback = commandArgs.join(' ');
        return message.reply(handleUserFeedback(feedback, senderID));
      case 'summary':
        const summary = await summarizeConversation(senderID);
        return message.reply(`Here's a summary of our conversation:\n${summary}`);
      case 'recommend':
        const recommendation = await getPersonalizedRecommendation(senderID);
        return message.reply(`Here's a personalized recommendation for you:\n${recommendation}`);
      default:
        return message.reply("Unknown command. Type '!help' for a list of available commands.");
    }
  }

  const aiResponse = await getAIResponse(input, senderID);
  return message.reply(aiResponse);
},

// New feature: Conversation context management
function manageConversationContext(userId, input, response) {
  const profile = getUserProfile(userId);
  const context = {
    input,
    response,
    timestamp: Date.now()
  };
  if (!profile.contextHistory) {
    profile.contextHistory = [];
  }
  profile.contextHistory.push(context);
  if (profile.contextHistory.length > 5) { // Keep last 5 interactions for context
    profile.contextHistory.shift();
  }
  saveUserData();
}

// Enhanced getAIResponse function with context management
async function getAIResponse(input, userId) {
  const userProfile = getUserProfile(userId);
  const context = userProfile.contextHistory ? userProfile.contextHistory.map(c => `User: ${c.input}\nAI: ${c.response}`).join('\n') : '';
  const sentiment = await analyzeSentiment(input);
const language = await detectLanguage(input);

const fullPrompt = `
  Context: ${context}
  User Input: ${input}
  Detected Sentiment: ${sentiment}
  Detected Language: ${language}
  
  Please provide a response that takes into account the user's sentiment, language, and previous context.
  AI:`;

let response = await geminiAPI(fullPrompt, userId);
response = generatePersonalizedResponse(userId, response);
manageConversationContext(userId, input, response);
return response;
}

// New feature: Multi-language support
const translations = {
  en: {
    greeting: "Hello! How can I help you today?",
    farewell: "Goodbye! Have a great day!",
    // Add more translations as needed
  },
  es: {
    greeting: "¡Hola! ¿Cómo puedo ayudarte hoy?",
    farewell: "¡Adiós! ¡Que tengas un buen día!",
    // Add more translations as needed
  },
  // Add more languages as needed
};

function getTranslation(key, language) {
  return translations[language]?.[key] || translations['en'][key];
}

// Enhanced onStart function with multi-language support
onStart: async function ({ api, event, args, message }) {
  const { threadID, senderID, messageID } = event;
  const input = args.join(' ');

  trackUserEngagement(senderID, 'command');

  const userLanguage = getUserProfile(senderID).preferences.language || 'en';

  if (!input) {
    return message.reply(getTranslation('greeting', userLanguage));
  }

  if (input.startsWith('!')) {
    const [command, ...commandArgs] = input.slice(1).split(' ');
    switch (command) {
      case 'clear':
      case 'setname':
      case 'help':
        const result = handleCommand(command, commandArgs, senderID);
        return message.reply(result);
      case 'feedback':
        const feedback = commandArgs.join(' ');
        return message.reply(handleUserFeedback(feedback, senderID));
      case 'summary':
        const summary = await summarizeConversation(senderID);
        return message.reply(`Here's a summary of our conversation:\n${summary}`);
      case 'recommend':
        const recommendation = await getPersonalizedRecommendation(senderID);
        return message.reply(`Here's a personalized recommendation for you:\n${recommendation}`);
      case 'setlanguage':
        const newLanguage = commandArgs[0];
        if (translations[newLanguage]) {
          setUserPreference(senderID, 'language', newLanguage);
          return message.reply(`Language set to ${newLanguage}`);
        } else {
          return message.reply("Unsupported language. Please choose from: " + Object.keys(translations).join(", "));
        }
      default:
        return message.reply("Unknown command. Type '!help' for a list of available commands.");
    }
  }

  const aiResponse = await getAIResponse(input, senderID);
  return message.reply(aiResponse);
},

// New feature: User activity reminders
function checkUserInactivity() {
  const now = Date.now();
  for (const userId in userData) {
    const profile = userData[userId];
    if (profile.engagement && now - profile.engagement.lastActive > 7 * 24 * 60 * 60 * 1000) { // 7 days
      sendInactivityReminder(userId);
    }
  }
}

function sendInactivityReminder(userId) {
  const message = "Hey there! We haven't chatted in a while. Is there anything I can help you with?";
  // Implement the logic to send this message to the user
  console.log(`Sending reminder to user ${userId}: ${message}`);
}
// ... (previous code remains unchanged)

// New feature: User activity reminders
function checkUserInactivity() {
  const now = Date.now();
  for (const userId in userData) {
    const profile = userData[userId];
    if (profile.engagement && now - profile.engagement.lastActive > 7 * 24 * 60 * 60 * 1000) { // 7 days
      sendInactivityReminder(userId);
    }
  }
}

function sendInactivityReminder(userId) {
  const message = "Hey there! We haven't chatted in a while. Is there anything I can help you with?";
  // Implement the logic to send this message to the user
  console.log(`Sending reminder to user ${userId}: ${message}`);
}

// Set up a daily check for user inactivity
setInterval(checkUserInactivity, 24 * 60 * 60 * 1000);

// New feature: Conversation analytics
function generateConversationAnalytics(userId) {
  const profile = getUserProfile(userId);
  const totalInteractions = profile.engagement ? profile.engagement.interactions : 0;
  const averageSentimentScore = calculateAverageSentiment(profile.contextHistory);
  const mostDiscussedTopics = analyzeTopics(profile.contextHistory);

  return {
    totalInteractions,
    averageSentimentScore,
    mostDiscussedTopics
  };
}

function calculateAverageSentiment(contextHistory) {
  // Implement sentiment calculation logic
  return 0.5; // Placeholder
}

function analyzeTopics(contextHistory) {
  // Implement topic analysis logic
  return ['AI', 'Technology']; // Placeholder
}

// Enhanced onStart function with analytics
onStart: async function ({ api, event, args, message }) {
  const { threadID, senderID, messageID } = event;
  const input = args.join(' ');

  trackUserEngagement(senderID, 'command');

  const userLanguage = getUserProfile(senderID).preferences.language || 'en';

  if (!input) {
    return message.reply(getTranslation('greeting', userLanguage));
  }

  if (input.startsWith('!')) {
    const [command, ...commandArgs] = input.slice(1).split(' ');
    switch (command) {
      // ... (previous cases remain unchanged)
      case 'analytics':
        const analytics = generateConversationAnalytics(senderID);
        return message.reply(`Conversation Analytics:\nTotal Interactions: ${analytics.totalInteractions}\nAverage Sentiment: ${analytics.averageSentimentScore}\nMost Discussed Topics: ${analytics.mostDiscussedTopics.join(', ')}`);
      default:
        return message.reply("Unknown command. Type '!help' for a list of available commands.");
    }
  }

  const aiResponse = await getAIResponse(input, senderID);
  return message.reply(aiResponse);
},

// New feature: Conversation branching
function createConversationBranch(userId) {
  const profile = getUserProfile(userId);
  if (!profile.branches) {
    profile.branches = [];
  }
  const newBranch = {
    id: Date.now(),
    contextHistory: [...profile.contextHistory]
  };
  profile.branches.push(newBranch);
  profile.currentBranch = newBranch.id;
  saveUserData();
  return newBranch.id;
}

function switchConversationBranch(userId, branchId) {
  const profile = getUserProfile(userId);
  const branch = profile.branches.find(b => b.id === branchId);
  if (branch) {
    profile.currentBranch = branchId;
    profile.contextHistory = [...branch.contextHistory];
    saveUserData();
    return true;
  }
  return false;
}

// Enhanced onStart function with branching
onStart: async function ({ api, event, args, message }) {
  const { threadID, senderID, messageID } = event;
  const input = args.join(' ');

  trackUserEngagement(senderID, 'command');

  const userLanguage = getUserProfile(senderID).preferences.language || 'en';

  if (!input) {
    return message.reply(getTranslation('greeting', userLanguage));
  }

  if (input.startsWith('!')) {
    const [command, ...commandArgs] = input.slice(1).split(' ');
    switch (command) {
      // ... (previous cases remain unchanged)
      case 'newbranch':
        const newBranchId = createConversationBranch(senderID);
        return message.reply(`New conversation branch created with ID: ${newBranchId}`);
      case 'switchbranch':
        const branchId = parseInt(commandArgs[0]);
        if (switchConversationBranch(senderID, branchId)) {
          return message.reply(`Switched to conversation branch: ${branchId}`);
        } else {
          return message.reply(`Branch not found: ${branchId}`);
        }
      default:
        return message.reply("Unknown command. Type '!help' for a list of available commands.");
    }
  }

  const aiResponse = await getAIResponse(input, senderID);
  return message.reply(aiResponse);
},

// Final touches and cleanup
function cleanup() {
  saveUserData();
  console.log("Cleanup completed. User data saved.");
}

process.on('SIGINT', () => {
  console.log("Received SIGINT. Cleaning up...");
  cleanup();
  process.exit(0);
});
