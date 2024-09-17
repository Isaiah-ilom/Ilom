const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Replace with your actual API key (stored securely, e.g., in environment variable)
const apiKey = process.env.GROQ_API_KEY || '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';

const chatHistoryDir = 'groqllama70b';
const systemPrompt = "Examine the prompt and respond precisely as directed, omitting superfluous information. Provide brief responses, typically 1-2 sentences, except when detailed answers like essays, poems, or stories are requested."; //change if needed

const groq = new Groq({ apiKey });

module.exports = {
    config: {
        name: 'l',
        version: '1.1.11',
        author: 'Raphael × Heis',
        countDown: 0,
        role: 0,
        category: 'Ai',
        description: {
            en: 'Use it if you want very fast answers. (Uses Llama3 70b hosted on groq)',
        },
        guide: {
            en: '{pn} [question]\n\nReply clear to clear the chat history.\nOr, use:\n\n{pn} clear',
        },
    },
    onStart: async function ({ api, message, event, args, commandName }) {
        var prompt = args.join(" ");

        let chatHistory = [];

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(event.senderID);
            message.reply("Chat history cleared!");
            return;
        }

        var content = (event.type == "message_reply") ? event.messageReply.body : args.join(" ");

        if (event.type == "message_reply") {
            content = content + " " + prompt;
            clearChatHistory(event.senderID);

            api.setMessageReaction("⌛", event.messageID, () => { }, true);

            const startTime = Date.now();

            try {
                clearChatHistory(event.senderID);

                const chatMessages = [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": content }
                ];

                const chatCompletion = await groq.chat.completions.create({
                    "messages": chatMessages,
                    "model": "llama3-70b-8192",
                    "temperature": 0.6,
                    "max_tokens": 8192,
                    "top_p": 0.8,
                    "stream": false,
                    "stop": null
                });

                const assistantResponse = chatCompletion.choices[0].message.content;

                const endTime = new Date().getTime();
                const completionTime = ((endTime - startTime) / 1000).toFixed(2);
                const totalWords = assistantResponse.split(/\s+/).filter(word => word !== '').length;

                let finalMessage = `${assistantResponse}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${totalWords}`;

                message.reply(finalMessage, (err, info) => {
                    if (!err) {
                        // Assuming you have a mechanism to handle replies
                        // global.GoatBot.onReply.set(info.messageID, { ... }); 
                    } else {
                        console.error("Error sending message:", err);
                    }
                });

                chatHistory.push({ role: "user", content: prompt });
                chatHistory.push({ role: "assistant", content: assistantResponse });
                appendToChatHistory(event.senderID, chatHistory);

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                console.error("Error in chat completion:", error);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
                return message.reply("An error occurred.");
            }
        } else {
            clearChatHistory(event.senderID);

            if (args.length == 0 && prompt == "") {
                message.reply("Please provide a prompt.");
                return;
            }

            api.setMessageReaction("⌛", event.messageID, () => { }, true);

            const startTime = Date.now();

            try {
                clearChatHistory(event.senderID);

                const chatMessages = [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": prompt }
                ];

                const chatCompletion = await groq.chat.completions.create({
                    "messages": chatMessages,
                    "model": "llama3-70b-8192",
                    "temperature": 0.6,
                    "max_tokens": 8192,
                    "top_p": 0.8,
                    "stream": false,
                    "stop": null
                });

                const assistantResponse = chatCompletion.choices[0].message.content;

                const endTime = new Date().getTime();
                const completionTime = ((endTime - startTime) / 1000).toFixed(2);
                const totalWords = assistantResponse.split(/\s+/).filter(word => word !== '').length;

                let finalMessage = `${assistantResponse}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${totalWords}`;

                message.reply(finalMessage, (err, info) => {
                    if (!err) {
                        // Assuming you have a mechanism to handle replies
                        // global.GoatBot.onReply.set(info.messageID, { ... }); 
                    } else {
                        console.error("Error sending message:", err);
                    }
                });

                chatHistory.push({ role: "user", content: prompt });
                chatHistory.push({ role: "assistant", content: assistantResponse });
                appendToChatHistory(event.senderID, chatHistory);

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                console.error("Error in chat completion:", error);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
                return message.reply("An error occurred.");
            }
        }
    },
    onReply: async function ({ api, message, event, Reply, args }) {
        var prompt = args.join(" ");
        let { author, commandName } = Reply;

        if (event.senderID !== author) return;

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(author);
            message.reply("Chat history cleared!");
            return;
        }

        api.setMessageReaction("⌛", event.messageID, () => { }, true);

        const startTime = Date.now();

        try {
            const chatHistory = loadChatHistory(event.senderID);

            const chatMessages = [
                { "role": "system", "content": systemPrompt },
                ...chatHistory,
                { "role": "user", "content": prompt }
            ];

            const chatCompletion = await groq.chat.completions.create({
                "messages": chatMessages,
                "model": "llama3-70b-8192",
                "temperature": 0.6,
                "max_tokens": 8192,
                "top_p": 0.8,
                "stream": false,
                "stop": null
            });

            const assistantResponse = chatCompletion.choices[0].message.content;

            const endTime = new Date().getTime();
            const completionTime = ((endTime - startTime) / 1000).toFixed(2);
            const totalWords = assistantResponse.split(/\s+/).filter(word => word !== '').length;

            let finalMessage = `${assistantResponse}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${totalWords}`;

            message.reply(finalMessage, (err, info) => {
                if (!err) {
                    // Assuming you have a mechanism to handle replies
                    // global.GoatBot.onReply.set(info.messageID, { ... }); 
                } else {
                    console.error("Error sending message:", err);
                }
            });

            chatHistory.push({ role: "user", content: prompt });
            chatHistory.push({ role: "assistant", content: assistantResponse });
            appendToChatHistory(event.senderID, chatHistory);

            api.setMessageReaction("✅", event.messageID, () => { }, true);
        } catch (error) {
            console.error("Error in chat completion:", error);
            message.reply("An error occurred.");
            api.setMessageReaction("❌", event.messageID, () => { }, true);
        }
    }
};

function loadChatHistory(uid) {
    const chatHistoryFile = path.join(chatHistoryDir, 'memory_' + uid + '.json');

    try {
        if (fs.existsSync(chatHistoryFile)) {
            const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
            const chatHistory = JSON.parse(fileData);
            return chatHistory.map((message) => {
                if (message.role === "user" && message.parts) {
                    return { role: "user", content: message.parts[0].text };
                } else {
                    return message;
                }
            });
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading chat history for UID ${uid}:`, error);
        return [];
    }
}

function appendToChatHistory(uid, chatHistory) {
    const chatHistoryFile = path.join(chatHistoryDir, 'memory_' + uid + '.json');

    try {
        if (!fs.existsSync(chatHistoryDir)) {
            fs.mkdirSync(chatHistoryDir);
        }

        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

function clearChatHistory(uid) {
    const chatHistoryFile = path.join(chatHistoryDir, 'memory_' + uid + '.json');

    try {
        fs.unlinkSync(chatHistoryFile);
    } catch (err) {
        console.error("Error deleting chat history file:", err);
    }
}
