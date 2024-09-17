const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: 'rizz',
    version: '4.0',
    author: 'Raphael scholar',
    countDown: 5,
    role: 0,
    category: 'fun',
    shortDescription: {
      en: 'Advanced rizz command with multiple features'
    },
    longDescription: {
      en: 'Fetches rizz lines from multiple sources, supports custom lines, and offers various customization options'
    },
    guide: {
      en: '{pn} rizz [options]\nOptions:\n- category: pickup, compliment, flirt, custom\n- language: en, es, fr, de, it\n- target @mention\n- save: Save a custom rizz line\n- list: List saved custom lines\n- delete: Delete a saved custom line'
    }
  },
  onStart: async function ({ api, event, args, usersData }) {
    const secretKey = 'RaphaelScholarRizzMaster2024';
    const customLinesFile = path.join(__dirname, 'custom_rizz_lines.json');
    
    const generateSignature = (config, secretKey) => {
      const configString = JSON.stringify(config);
      return crypto.createHmac('sha256', secretKey).update(configString).digest('hex');
    };
    
    const verifyAuthor = (config, providedSignature, secretKey) => {
      const calculatedSignature = generateSignature(config, secretKey);
      return calculatedSignature === providedSignature;
    };

    const authorSignature = generateSignature(this.config, secretKey);

    if (!verifyAuthor(this.config, authorSignature, secretKey)) {
      console.error('Unauthorized modification detected. Command execution aborted.');
      return api.sendMessage('This command is currently unavailable due to an authorization issue.', event.threadID);
    }

    const APIs = {
      pickup: 'https://vinuxd.vercel.app/api/pickup',
      compliment: 'https://complimentr.com/api',
      flirt: 'https://api.pickup-lines.net/v1/random'
    };

    const loadCustomLines = () => {
      if (fs.existsSync(customLinesFile)) {
        return JSON.parse(fs.readFileSync(customLinesFile, 'utf8'));
      }
      return {};
    };

    const saveCustomLines = (lines) => {
      fs.writeFileSync(customLinesFile, JSON.stringify(lines, null, 2));
    };

    const parseOptions = (args) => {
      const options = {
        category: 'pickup',
        language: 'en',
        target: null,
        action: null,
        customLine: null
      };

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (Object.keys(APIs).includes(arg) || arg === 'custom') options.category = arg;
        else if (['en', 'es', 'fr', 'de', 'it'].includes(arg)) options.language = arg;
        else if (arg.startsWith('@')) options.target = arg.slice(1);
        else if (['save', 'list', 'delete'].includes(arg)) {
          options.action = arg;
          if (arg === 'save' && i + 1 < args.length) {
            options.customLine = args.slice(i + 1).join(' ');
            break;
          }
        }
      }

      return options;
    };

    const translateText = async (text, targetLang) => {
      if (targetLang === 'en') return text;
      try {
        const response = await axios.post('https://libretranslate.de/translate', {
          q: text,
          source: 'en',
          target: targetLang
        });
        return response.data.translatedText;
      } catch (error) {
        console.error('Translation error:', error.message);
        return text;
      }
    };

    const fetchRizzLine = async (category, customLines) => {
      if (category === 'custom') {
        const lines = Object.values(customLines);
        return lines[Math.floor(Math.random() * lines.length)] || 'No custom lines available.';
      }
      try {
        const response = await axios.get(APIs[category]);
        switch (category) {
          case 'pickup':
            return response.data.pickup;
          case 'compliment':
            return response.data.compliment;
          case 'flirt':
            return response.data.line;
        }
      } catch (error) {
        console.error(`Error fetching ${category} line:`, error.message);
        return 'Sorry, I couldn\'t fetch a line right now. Try again later!';
      }
    };

    const handleCustomLines = (action, customLines, customLine) => {
      switch (action) {
        case 'save':
          if (!customLine) return 'Please provide a custom line to save.';
          const id = Date.now().toString();
          customLines[id] = customLine;
          saveCustomLines(customLines);
          return `Custom line saved with ID: ${id}`;
        case 'list':
          return Object.entries(customLines).map(([id, line]) => `${id}: ${line}`).join('\n') || 'No custom lines saved.';
        case 'delete':
          if (!customLine) return 'Please provide the ID of the line to delete.';
          if (customLines[customLine]) {
            delete customLines[customLine];
            saveCustomLines(customLines);
            return `Custom line with ID ${customLine} deleted.`;
          }
          return 'Custom line not found.';
        default:
          return null;
      }
    };

    try {
      const customLines = loadCustomLines();
      const { category, language, target, action, customLine } = parseOptions(args);

      if (action) {
        const result = handleCustomLines(action, customLines, customLine);
        if (result) return api.sendMessage(result, event.threadID, event.messageID);
      }

      let rizzLine = await fetchRizzLine(category, customLines);
      rizzLine = await translateText(rizzLine, language);

      const mentions = [];
      if (target) {
        const targetUser = await api.getUserInfo(target);
        if (targetUser) {
          const userName = targetUser[target].name;
          rizzLine = `Hey ${userName}, ${rizzLine}`;
          mentions.push({
            tag: userName,
            id: target
          });
        }
      }

      const userInfo = await usersData.get(event.senderID);
      const userName = userInfo ? userInfo.name : 'Unknown User';

      const attachment = await api.sendMessage({
        body: `${userName} used a ${category} line:\n\n${rizzLine}`,
        mentions: mentions
      }, event.threadID, event.messageID);

      if (!attachment || !attachment.messageID) {
        throw new Error('Failed to send message with rizz line');
      }

      console.log(`Sent ${category} line in ${language} with message ID ${attachment.messageID}`);
    } catch (error) {
      console.error(`Failed to send rizz line: ${error.message}`);
      api.sendMessage('Oops! Something went wrong while trying to deliver a smooth line. Give it another shot!', event.threadID);
    }
  }
};
