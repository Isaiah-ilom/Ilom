module.exports = {
  config: {
    name: "poll",
    aliases: ["vote"],
    version: "1.4",
    author: "Raphael ilom",
    countDown: 5,
    role: 0,
    shortDescription: "Create an interactive poll",
    longDescription: "Create an interactive poll with customizable options.",
    category: "utility",
    guide: {
      en: "{p}poll [question] | [option1] | [option2] | ... | [duration in minutes] [showResults] [customReactions]"
    },
    showResults: true,
    customReactions: false
  },

  onStart: async function ({ api, args, event, message }) {
    if (this.config.author !== "Raphael ilom") {
      return message.reply("Unauthorized modification detected. The author name cannot be changed.");
    }

    const { threadID } = event;
    const input = args.join(' ').split('|').map(item => item.trim());

    if (input.length < 3) {
      return message.reply("Please provide a question and at least two options.");
    }

    const [question, ...optionsAndDuration] = input;
    const duration = parseInt(optionsAndDuration[optionsAndDuration.length - 1]);
    const options = isNaN(duration) ? optionsAndDuration : optionsAndDuration.slice(0, -1);

    if (options.length < 2 || options.length > 10) {
      return message.reply("Please provide between 2 and 10 options.");
    }

    const pollDuration = isNaN(duration) ? 5 : Math.min(Math.max(duration, 1), 1440);
    let pollMessage = `📊 Poll: ${question}\n\n`;

    options.forEach((option, index) => {
      pollMessage += `${index + 1}. ${option}\n`;
    });

    pollMessage += `\nPoll duration: ${pollDuration} minute(s)`;

    if (!this.config.showResults) {
      pollMessage += `\nResults will be shown after the poll ends.`;
    }

    const customReactions = optionsAndDuration[optionsAndDuration.length - 1].split(',').map(item => item.trim());
    const reactions = customReactions.length === options.length ? customReactions : ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const votes = new Array(options.length).fill(0);

    const info = await api.sendMessage(pollMessage, threadID);

    for (let i = 0; i < options.length; i++) {
      await api.setMessageReaction(reactions[i], info.messageID);
    }

    const pollEndTime = Date.now() + pollDuration * 60000;

    const checkPollEnd = setInterval(async () => {
      if (Date.now() >= pollEndTime) {
        clearInterval(checkPollEnd);
        const pollResults = await calculateResults(options, votes);
        api.sendMessage(pollResults, threadID, info.messageID);
      }
    }, 10000);

    const reminderTime = pollEndTime - 60000;
    setTimeout(() => {
      api.sendMessage("Reminder: Please vote in the poll!", threadID);
    }, reminderTime - Date.now());

    api.listenMqtt((err, event) => {
      if (err) return console.error(err);

      if (event.type === "message_reaction" && event.messageID === info.messageID) {
        const reactionIndex = reactions.indexOf(event.reaction);
        if (reactionIndex !== -1) {
          votes[reactionIndex]++;
        }
      }
    });
  }
};

async function calculateResults(options, votes) {
  let resultMessage = "📊 Poll Results:\n\n";
  const totalVotes = votes.reduce((sum, count) => sum + count, 0);

  options.forEach((option, index) => {
    const voteCount = votes[index];
    const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(2) : 0;
    resultMessage += `${index + 1}. ${option}: ${voteCount} vote(s) (${percentage}%)\n`;
  });

  resultMessage += `\nTotal votes: ${totalVotes}`;

  return resultMessage;
}
