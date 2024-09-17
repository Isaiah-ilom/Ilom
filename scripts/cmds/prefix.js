const fs = require("fs-extra");

module.exports = {
  config: {
    name: "prefix",
    version: "1.3",
    author: "NTKhang",// edited by Raphael scholar
    countDown: 5,
    role: 0,
    shortDescription: "Change the prefix of the bot",
    longDescription: "Change the bot command mark in your chat box or the whole bot system (only admin bot)",
    category: "config",
    guide: {
      en: "   {pn} <𝐧𝐞𝐰 𝐏𝐫𝐞𝐟𝐢𝐱>: 𝐂𝐡𝐚𝐧𝐠𝐞 𝐍𝐞𝐰 𝐏𝐫𝐞𝐟𝐢𝐱 𝐈𝐧 𝐘𝐨𝐮𝐫 𝐂𝐡𝐚𝐭 𝐁𝐨𝐱"          + "\n   𝐄𝐱𝐚𝐦𝐩𝐥𝐞:"          + "\n    {pn} "          + "\n\n   {pn} <𝐧𝐞𝐰 𝐏𝐫𝐞𝐟𝐢𝐱> -𝐠: 𝐂𝐡𝐚𝐧𝐠𝐞 𝐍𝐞𝐰 𝐏𝐫𝐞𝐟𝐢𝐱 𝐈𝐧 𝐒𝐲𝐬𝐭𝐞𝐦 𝐁𝐨𝐭 (𝐨𝐧𝐥𝐲 𝐀𝐝𝐦𝐢𝐧 𝐁𝐨𝐭)"          + "\n   𝐄𝐱𝐚𝐦𝐩𝐥𝐞:"          + "\n    {pn} -𝐠"          + "\n\n   {pn} 𝐑𝐞𝐬𝐞𝐭: 𝐂𝐡𝐚𝐧𝐠𝐞 𝐏𝐫𝐞𝐟𝐢𝐱 𝐈𝐧 𝐘𝐨𝐮𝐫 𝐁𝐨𝐱 𝐂𝐡𝐚𝐭 𝐓𝐨 𝐃𝐞𝐟𝐚𝐮𝐥𝐭"
    }
  },

  langs: {
    en: {
      reset: "Ilom 𝐏𝐫𝐞𝐟𝐢𝐱 𝐇𝐚𝐬 𝐁𝐞𝐞𝐧 𝐑𝐞𝐬𝐞𝐭 𝐓𝐨 𝐃𝐞𝐟𝐚𝐮𝐥𝐭: %1",        𝐎𝐧𝐥𝐲𝐚𝐝𝐦𝐢𝐧: "𝐬𝐨𝐫𝐫𝐲, 𝐎𝐧𝐥𝐲 𝐀𝐝𝐦𝐢𝐧 𝐂𝐚𝐧 𝐂𝐡𝐚𝐧𝐠𝐞 𝐓𝐡𝐞 𝐏𝐫𝐞𝐟𝐢𝐱 𝐎𝐟 𝐓𝐡𝐞 Raphael  𝐁𝐨𝐭 𝐒𝐲𝐬𝐭𝐞𝐦.",        𝐂𝐨𝐧𝐟𝐢𝐫𝐦𝐠𝐥𝐨𝐛𝐚𝐥: "𝐫𝐞𝐚𝐜𝐭 𝐓𝐨 𝐓𝐡𝐢𝐬 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐓𝐨 𝐂𝐨𝐧𝐟𝐢𝐫𝐦 𝐂𝐡𝐚𝐧𝐠𝐢𝐧𝐠 Raphael '𝐬 𝐆𝐥𝐨𝐛𝐚𝐥 𝐏𝐫𝐞𝐟𝐢𝐱.",        𝐂𝐨𝐧𝐟𝐢𝐫𝐦𝐭𝐡𝐢𝐬𝐭𝐡𝐫𝐞𝐚𝐝: "𝐫𝐞𝐚𝐜𝐭 𝐓𝐨 𝐓𝐡𝐢𝐬 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐓𝐨 𝐂𝐨𝐧𝐟𝐢𝐫𝐦 𝐂𝐡𝐚𝐧𝐠𝐢𝐧𝐠 Ilom 𝐬 𝐏𝐫𝐞𝐟𝐢𝐱 𝐈𝐧 𝐘𝐨𝐮𝐫 𝐂𝐡𝐚𝐭 𝐁𝐨𝐱.",        𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐠𝐥𝐨𝐛𝐚𝐥: "𝐜𝐡𝐚𝐧𝐠𝐞𝐝 𝐓𝐡𝐞 𝐏𝐫𝐞𝐟𝐢𝐱 𝐎𝐟 Ilom 𝐆𝐥𝐨𝐛𝐚𝐥 𝐒𝐲𝐬𝐭𝐞𝐦 𝐓𝐨: %1",        𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐭𝐡𝐢𝐬𝐭𝐡𝐫𝐞𝐚𝐝: "𝐜𝐡𝐚𝐧𝐠𝐞𝐝 𝐂𝐥𝐚𝐫𝐤'𝐬 𝐏𝐫𝐞𝐟𝐢𝐱 𝐈𝐧 𝐘𝐨𝐮𝐫 𝐂𝐡𝐚𝐭 𝐁𝐨𝐱 𝐓𝐨: %1",
      myPrefix: "╭────────────⦿\n│✪𝐌𝐲 𝐏𝐫𝐞𝐟𝐢𝐱 𝐈𝐬「 %2 」\n│✪𝐌𝐨𝐝𝐞: 「𝐏𝐮𝐛𝐥𝐢𝐜」\n│✪𝐎𝐰𝐧𝐞𝐫:「 Raphael Scholar × Heis  」\n│✪𝐄𝐧𝐣𝐨𝐲 𝐔𝐬𝐢𝐧𝐠😄\n╰────────────⦿"
    }
  },

  onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
    if (!args[0])
      return message.SyntaxError();

    if (args[0] === 'reset') {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply(getLang("reset", global.GoatBot.config.prefix));
    }

    const newPrefix = args[0];
    const formSet = {
      commandName,
      author: event.senderID,
      newPrefix
    };

    if (args[1] === "-g") {
      if (role < 2)
        return message.reply(getLang("onlyAdmin"));
      else
        formSet.setGlobal = true;
    } else {
      formSet.setGlobal = false;
    }

    return message.reply(args[1] === "-g" ? getLang("confirmGlobal") : getLang("confirmThisThread"), (err, info) => {
      formSet.messageID = info.messageID;
      global.GoatBot.onReaction.set(info.messageID, formSet);
    });
  },

  onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
    const { author, newPrefix, setGlobal } = Reaction;
    if (event.userID !== author)
      return;
    if (setGlobal) {
      global.GoatBot.config.prefix = newPrefix;
      fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
      return message.reply(getLang("successGlobal", newPrefix));
    } else {
      await threadsData.set(event.threadID, newPrefix, "data.prefix");
      return message.reply(getLang("successThisThread", newPrefix));
    }
  },

  onChat: async function ({ event, message, getLang }) {
    if (event.body && event.body.toLowerCase() === "prefix") {
      return () => {
        return message.reply(getLang("myPrefix", global.GoatBot.config.prefix, utils.getPrefix(event.threadID)));
      };
    }
  }
};
