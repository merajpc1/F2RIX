module.exports.config = {
  name: "love",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "F2RIX Bot",
  description: "❤️ Love Spam - 1000 I LOVE YOU",
  commandCategory: "fun",
  usages: "prefix+love",
  cooldowns: 10,
  dependencies: {}
};

module.exports.run = async function({ api, event }) {
  const emojis = [
    "💖", "🥰", "❤️", "💓", "💕", "💗", "💞", "💘", "💝", "💟",
    "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "❣️", "❤️‍🔥", "❤️‍🩹"
  ];

  const delay = 2000; // প্রতি ২ সেকেন্ডে একটা message

  for (let i = 1; i <= 1000; i++) {
    const emoji = emojis[(i - 1) % emojis.length];
    const msg = `I LOVE YOU ${i} ${emoji}`;
    setTimeout(() => {
      api.sendMessage(msg, event.threadID);
    }, i * delay);
  }
};
