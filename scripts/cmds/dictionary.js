const axios = require('axios');

module.exports = {
  config: {
    name: "dictionary",
    version: "1.0",
    author: "Raphael ilom",
    countDown: 5,
    role: 0,
    shortDescription: "Look up the definition of a word.",
    longDescription: {
      en: "This command allows you to look up the definition of a word using an online dictionary API."
    },
    category: "Utility",
    guide: {
      en: "{prefix}dictionary <word>"
    }
  },

  onStart: async function({ api, event, args }) {
    const word = args.join(' ');
    if (!word) {
      return api.sendMessage("Please provide a word to look up.", event.threadID, event.messageID);
    }

    try {
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const definition = response.data[0].meanings[0].definitions[0].definition;
      api.sendMessage(`Definition of ${word}: ${definition}`, event.threadID, event.messageID);
    } catch (error) {
      console.error(`Error fetching definition: ${error.message}`);
      api.sendMessage("An error occurred while fetching the definition.", event.threadID, event.messageID);
    }
  }
};
