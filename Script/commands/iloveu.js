module.exports.config = {
  name: "iloveu",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "F2RIX Bot",
  description: "❤️ Love Spam",
  commandCategory: "fun",
  usages: "prefix+iloveu [শুরু] [শেষ] | prefix+iloveu stop",
  cooldowns: 10,
  dependencies: {}
};

// প্রতিটা thread এর timeout গুলো store করা হবে
const activeTimers = new Map();

module.exports.run = async function({ api, event, args }) {
  const emojis = [
    "💖", "🥰", "❤️", "💓", "💕", "💗", "💞", "💘", "💝", "💟",
    "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "❣️", "❤️‍🔥", "❤️‍🩹"
  ];

  const delay = 2000;
  const threadID = event.threadID;

  // /iloveu stop → সব থামিয়ে দাও
  if (args[0] === "stop") {
    if (activeTimers.has(threadID)) {
      const timers = activeTimers.get(threadID);
      timers.forEach(t => clearTimeout(t));
      activeTimers.delete(threadID);
      return api.sendMessage("⛔ Love spam বন্ধ করা হয়েছে!", threadID);
    } else {
      return api.sendMessage("⚠️ কোনো active spam নেই!", threadID);
    }
  }

  let start = parseInt(args[0]);
  let end = parseInt(args[1]);

  if (!isNaN(start) && isNaN(end)) {
    end = start;
    start = 1;
  }

  if (isNaN(start) || isNaN(end)) {
    start = 1;
    end = 10;
  }

  if (start > end) {
    return api.sendMessage("❌ শুরুর সংখ্যা শেষের চেয়ে বড় হতে পারবে না!", threadID);
  }

  if ((end - start + 1) > 1000) {
    return api.sendMessage("❌ সর্বোচ্চ ১০০০টা message পাঠানো যাবে!", threadID);
  }

  // আগের timer থাকলে আগে বন্ধ করো
  if (activeTimers.has(threadID)) {
    const timers = activeTimers.get(threadID);
    timers.forEach(t => clearTimeout(t));
  }

  const timers = [];
  let counter = 0;

  for (let i = start; i <= end; i++) {
    counter++;
    const emoji = emojis[(i - 1) % emojis.length];
    const msg = `I LOVE YOU ${i} ${emoji}`;
    const t = setTimeout(() => {
      api.sendMessage(msg, threadID);
    }, counter * delay);
    timers.push(t);
  }

  activeTimers.set(threadID, timers);
};
