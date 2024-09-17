const { google } = require("googleapis");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const stream = require("stream");
const { Buffer } = require('buffer');
const fs = require('fs');

dotenv.config({ override: true });

const API_KEY = "AIzaSyD8mKxqcjqj4m6szunVeSBnBxKr5pVUJx8"; //put key here
const model = "gemini-1.5-flash-latest";
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

var uid;
var prompt;
var fileUrls = [];
var totalTimeInSeconds;
var wordCount;

async function imageUrlToBase64(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

async function uploadImageAndGetFileData(genaiService, auth, imageUrl) {
    if (!imageUrl.startsWith("http")) {
        imageUrl = "";
    }

    const imageBase64 = await imageUrlToBase64(imageUrl);
    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(imageBase64, "base64"));
    const media = {
        mimeType: "image/png",
        body: bufferStream,
    };
    const body = { file: { displayName: "Uploaded Image" } };
    const createFileResponse = await genaiService.media.upload({
        media,
        auth,
        requestBody: body,
    });
    const file = createFileResponse.data.file;
    return { file_uri: file.uri, mime_type: file.mimeType };
}
function saveUrls(uid, urls) {
    const urlsFile = `uids/${uid}_urls_gemini_1.5_flash.json`;

    try {
        if (urls && urls.length > 0) {
            const absoluteUrls = urls.filter(url => url.startsWith("http"));
            if (fs.existsSync(urlsFile)) {
                fs.unlinkSync(urlsFile);
            }
            fs.writeFileSync(urlsFile, JSON.stringify(absoluteUrls, null, 2));
        }
        else {
            const existingUrls = loadUrls(uid);
            fs.writeFileSync(urlsFile, JSON.stringify(existingUrls, null, 2));
        }
    } catch (error) {
        console.error(`Error saving URLs for UID ${uid}:`, error);
    }
}


function loadUrls(uid) {
    const urlsFile = `uids/${uid}_urls_gemini_1.5_flash.json`;

    try {
        if (fs.existsSync(urlsFile)) {
            const fileData = fs.readFileSync(urlsFile, 'utf8');
            return JSON.parse(fileData);
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading URLs for UID ${uid}:`, error);
        return [];
    }
}

function loadChatHistory(uid) {
    const chatHistoryFile = `uids/${uid}_gemini_1.5_flash.json`;

    try {
        if (fs.existsSync(chatHistoryFile)) {
            const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
            return JSON.parse(fileData);
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading chat history for UID ${uid}:`, error);
        return [];
    }
}

function appendToChatHistory(uid, chatHistory) {
    const chatHistoryFile = `uids/${uid}_gemini_1.5_flash.json`;

    try {
        if (!fs.existsSync('uids')) {
            fs.mkdirSync('uids');
        }

        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

async function getTextGemini(uid, prompt = "", fileUrls, reply) {
    const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
    const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);
    const startTime = Date.now();
    let savedUrls = [];
    let chatHistory = loadChatHistory(uid);

    const updatedPrompt = chatHistory
        .flatMap(message => message.parts.map(part => part.text))
        .join('\n')
        .trim() + '\n' + prompt;

    if (reply) {
        if (fileUrls && fileUrls.length > 0) {
            saveUrls(uid, [], false);
            saveUrls(uid, fileUrls, true);
            savedUrls = fileUrls;
        } else {
            savedUrls = loadUrls(uid);
            saveUrls(uid, savedUrls, false);
        }
    } else {
        if (fileUrls && fileUrls.length > 0) {
            saveUrls(uid, fileUrls, true);
            savedUrls = loadUrls(uid);
            savedUrls = [];
            savedUrls = fileUrls;
        } else {
            savedUrls = [];
            saveUrls(uid, [], false);
        }
    }

    const fileDataParts = [];

    if (savedUrls.length > 0) {
        for (const fileUrl of savedUrls) {
            const fileData = await uploadImageAndGetFileData(genaiService, auth, fileUrl);
            fileDataParts.push(fileData);
        }
    }

    const contents = {
        contents: [
            {
                role: "user",
                parts: [{ text: updatedPrompt }, ...fileDataParts.map(data => ({ file_data: data }))],
            },
        ],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generation_config: {
            maxOutputTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
        },
    };

    console.log("Contents:\n", contents.contents);

    const generateContentResponse = await genaiService.models.generateContent({
        model: `models/${model}`,
        requestBody: contents,
        auth: auth,
        tools: [{
            "codeExecution": {},
        },
        ],
    });

    const endTime = Date.now();
    totalTimeInSeconds = (endTime - startTime) / 1000;
    wordCount = generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text.split(/\s+/).length || 0;

    const modelMessage = { role: "model", parts: [{ text: await generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text }] };

    chatHistory.push({ role: "user", parts: [{ text: prompt, file_url: fileUrls.join(",") }] });
    chatHistory.push(modelMessage);

    appendToChatHistory(uid, chatHistory);

    return generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}


function clearChatHistory(uid) {
    const chatHistoryFile = `uids/${uid}_gemini_1.5_flash.json`;
    const urlsFile = `uids/${uid}_urls_gemini_1.5_flash.json`;

    try {
        if (fs.existsSync(chatHistoryFile)) {
            fs.unlinkSync(chatHistoryFile);
            console.log(`Chat history for UID ${uid} cleared successfully.`);
        } else {
            console.log(`No chat history found for UID ${uid}.`);
        }

        if (fs.existsSync(urlsFile)) {
            fs.unlinkSync(urlsFile);
            console.log(`URLs for UID ${uid} cleared successfully.`);
        } else {
            console.log(`No URLs found for UID ${uid}.`);
        }
    } catch (error) {
        console.error(`Error clearing chat history and URLs for UID ${uid}:`, error);
    }
}



module.exports = {
    config: {
        name: "g",
        version: "1.3",
        author: "Raphael × Heis",
        countDown: 5,
        role: 0,
        description: {
            en: "Fast input text and images with Google Gemini 1.5 flash. Upto 1M context window."
        },
        guide: { en: "{pn} <query>" },
        category: "ai",
    },
    onStart: async function ({ api, message, event, args, commandName }) {
        prompt = args.join(" ");
        uid = event.senderID;

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(event.senderID);
            message.reply("Chat history cleared successfully for UID " + uid + ".");
            return;
        }

        var contentTextOnly = (event.type == "message_reply") ? event.messageReply.body : args.join(" ");
        var contextImageOnly = (event.type == "message_reply") ? event.body : args.join(" ");
        targetMessageID = (event.type == "message_reply") ? event.messageReply.messageID : event.messageID;

        if (event.type == "message_reply" && contentTextOnly) {
            console.log("message reply, text only");

            api.setMessageReaction("⌛", event.messageID, () => { }, true);

            try {
                prompt = prompt + " " + contentTextOnly;
                console.log("Prompt:", prompt);
                const text = await getTextGemini(uid, prompt, fileUrls = [], false);
                console.log("Text:", text);

                api.sendMessage(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, event.threadID, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                            replyToMessageID: targetMessageID
                        });
                    }
                }, targetMessageID);

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                message.reply(`${error.message}`);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
            };
        }
        else if (event.type == "message_reply" && contextImageOnly) {
            console.log("message reply, content not empty");
            const urlsFile = `uids/${uid}_urls_gemini_1.5_flash.json`;

            if (fs.existsSync(urlsFile)) {
                fs.unlinkSync(urlsFile);
                console.log(`URLs for UID ${uid} cleared successfully.`);

                fileUrls = [];

                console.log("File URLs after deletion:", fileUrls);
            } else {
                console.log(`No URLs found for UID ${uid}.`);
            }

            fileUrls = [];

            for (let i = 0; i < Math.min(event.messageReply.attachments.length); i++) {
                const imageUrl = event.messageReply.attachments[i]?.url;
                if (imageUrl) {
                    if (!imageUrl.startsWith("http")) {
                        fileUrls = [];
                    }
                    else {
                        fileUrls.push(imageUrl);
                    }
                }
            }

            console.log("File URLs:", fileUrls);

            api.setMessageReaction("⌛", event.messageID, () => { }, true);

            prompt = prompt + " " + contextImageOnly;

            console.log("Prompt:", prompt);
            try {
                const text = await getTextGemini(uid, prompt, fileUrls, false);
                console.log("Text:", text);


                api.sendMessage(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, event.threadID, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                            replyToMessageID: targetMessageID
                        });
                    }
                }, targetMessageID);

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                message.reply(`${error.message}`);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
            };
        }
        else {
            console.log("message not reply");
            const urlsFile = `uids/${uid}_urls_gemini_1.5_flash.json`;

            if (fs.existsSync(urlsFile)) {
                fs.unlinkSync(urlsFile);
                console.log(`URLs for UID ${uid} cleared successfully.`);

                fileUrls = [];

                console.log("File URLs after deletion:", fileUrls);
            } else {
                console.log(`No URLs found for UID ${uid}.`);
            }

            api.setMessageReaction("⌛", event.messageID, () => { }, true);
            try {
                const text = await getTextGemini(uid, prompt, fileUrls = [], false);
                console.log("Text:", text);


                message.reply(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                        });
                    }
                });

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                message.reply(`${error.message}`);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
            };
        }
    },
    onReply: async function ({ api, message, event, Reply, args }) {
        prompt = args.join(" ");
        uid = event.senderID;
        let question = args.join(" ");

        let { author, commandName } = Reply;

        if (event.senderID !== author) return;

        api.setMessageReaction("⌛", event.messageID, () => { }, true);

        try {
            prompt = question.trim() === "" ? "" : question;
            if (event.type == "message_reply" && event.attachments && event.attachments.length > 0) {

                const urlsFile = `uids/${uid}_urls_gemini_1.5_flash.json`;

                if (fs.existsSync(urlsFile)) {
                    fs.unlinkSync(urlsFile);
                    console.log(`URLs for UID ${uid} cleared successfully.`);

                    fileUrls = [];

                    console.log("File URLs after deletion:", fileUrls);
                } else {
                    console.log(`No URLs found for UID ${uid}.`);
                }

                for (let i = 0; i < event.attachments.length; i++) {
                    const imageUrl = event.attachments[i]?.url;
                    console.log(imageUrl);
                    if (imageUrl) {
                        if (!imageUrl.startsWith("http")) {
                            fileUrls = [];
                        } else {
                            fileUrls.push(imageUrl);
                        }
                    }
                }

                console.log("File URLs after deletion:", fileUrls);

                console.log(prompt);

                const text = await getTextGemini(uid, prompt, fileUrls, false);

                console.log("Text:", text);

                message.reply(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                        });
                    }
                });

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            }
            else {
                const text = await getTextGemini(uid, prompt, fileUrls, false);

                console.log("Text:", text);

                message.reply(`${text}\n\nCompletion time: ${totalTimeInSeconds.toFixed(2)} seconds\nTotal words: ${wordCount}`, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                        });
                    }
                });

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            }
        } catch (error) {
            message.reply(`${error.message}`);
            api.setMessageReaction("❌", event.messageID, () => { }, true);
        };
    }
}
