const axios = require('axios');

module.exports = {
  config: {
    name: "fetch2",
    version: "1.1",
    author: "Raphael ilom × Heis",
    countDown: 15,
    role: 2, // Restrict access to role 2 or higher
    shortDescription: "Fetch and display Pastebin content",
    longDescription: "Fetches the content from a Pastebin link (standard or raw) and displays it.",
    category: "utility",
    guide: "{p}{n} <Pastebin URL>"
  },
  onStart: async function ({ args, event, api }) {
    try {
      const pastebinUrl = args.join(" ").trim();
      if (!pastebinUrl) {
        return api.sendMessage("Please provide a Pastebin URL.", event.threadID, event.messageID);
      }

      // Check if the provided URL is a valid Pastebin link or raw link
      const validPastebinUrl = /^https?:\/\/pastebin\.com\/(?:raw\/)?[a-zA-Z0-9]+$/.test(pastebinUrl);
      if (!validPastebinUrl) {
        return api.sendMessage("Please provide a valid Pastebin URL.", event.threadID, event.messageID);
      }

      // Extract the paste ID from the URL and create the raw URL if necessary
      let rawUrl;
      if (pastebinUrl.includes('/raw/')) {
        rawUrl = pastebinUrl;
      } else {
        const pasteId = pastebinUrl.split('/').pop();
        rawUrl = `https://pastebin.com/raw/${pasteId}`;
      }

      // Fetch the raw content of the paste
      const response = await axios.get(rawUrl);

      // Send the content as a message
      const pasteContent = response.data;
      await api.sendMessage(`Content from Pastebin:\n\n${pasteContent}`, event.threadID, event.messageID);

    } catch (error) {
      console.error('Error fetching Pastebin content:', error.message);
      api.sendMessage(`Failed to fetch the Pastebin content. Error: ${error.message}`, event.threadID, event.messageID);
    }
  }
};￼Enter
