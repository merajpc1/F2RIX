module.exports.config = {
  name: "iloveu",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "F2RIX Bot",
  description: "❤️ Love Spam",
  commandCategory: "fun",
  usages: "prefix+iloveu [শুরু] [শেষ]",
  cooldowns: 10,
  dependencies: {}
};

module.exports.run = async function({ api, event, args }) {
  const emojis = [
    "💖", "🥰", "❤️", "💓", "💕", "💗", "💞", "💘", "💝", "💟",
    "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "❣️", "❤️‍🔥", "❤️‍🩹"
  ];

  const delay = 2000;

  let start = parseInt(args[0]);
  let end = parseInt(args[1]);

  // শুধু একটা সংখ্যা দিলে: /love 100 → 1 থেকে 100
  if (!isNaN(start) && isNaN(end)) {
    end = start;
    start = 1;
  }

  // কিছুই না দিলে default: 1 থেকে 10
  if (isNaN(start) || isNaN(end)) {
    start = 1;
    end = 10;
  }

  // start যেন end এর চেয়ে বড় না হয়
  if (start > end) {
    return api.sendMessage("❌ শুরুর সংখ্যা শেষের চেয়ে বড় হতে পারবে না!", event.threadID);
  }

  // সর্বোচ্চ 1000 message
  if ((end - start + 1) > 1000) {
    return api.sendMessage("❌ সর্বোচ্চ ১০০০টা message পাঠানো যাবে!", event.threadID);
  }

  api.sendMessage(`❤️ শুরু হচ্ছে ${start} থেকে ${end} পর্যন্ত!`, event.threadID);

  let counter = 0;
  for (let i = start; i <= end; i++) {
    counter++;
    const emoji = emojis[(i - 1) % emojis.length];
    const msg = `I LOVE YOU ${i} ${emoji}`;
    setTimeout(() => {
      api.sendMessage(msg, event.threadID);
    }, counter * delay);
  }
};
