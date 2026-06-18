const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// ---------- ক্যাশড API বেস ----------
let cachedApiBase = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 মিনিট

const getApiBase = async () => {
  const now = Date.now();
  if (cachedApiBase && (now - cacheTime) < CACHE_TTL) {
    return cachedApiBase;
  }
  try {
    const base = await axios.get("https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json");
    cachedApiBase = base.data.api;
    cacheTime = now;
    return cachedApiBase;
  } catch (e) {
    // ব্যাকআপ ফিক্সড URL (যদি গিটহাব ডাউন থাকে)
    return "https://azadx69x.is-a.dev";
  }
};

// ---------- ক্যানভাস হেল্পার ফাংশন (yt.js থেকে নেওয়া) ----------
function formatViews(n) {
  if (!n || n === 0) return "N/A views";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B views";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M views";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K views";
  return n + " views";
}

function truncate(text, maxLen) {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

function drawYTLogo(ctx, x, y) {
  const rw = 36, rh = 26, r = 6;
  ctx.fillStyle = "#FF0000";
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + rw - r, y);
  ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
  ctx.lineTo(x + rw, y + rh - r);
  ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
  ctx.lineTo(x + r, y + rh);
  ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  const cx = x + rw / 2 + 2, cy = y + rh / 2;
  ctx.moveTo(cx - 7, cy - 7);
  ctx.lineTo(cx + 9, cy);
  ctx.lineTo(cx - 7, cy + 7);
  ctx.closePath();
  ctx.fill();
}

async function generateSearchImage(results, query, type) {
  const W = 640;
  const HEADER_H = 80;
  const ROW_H = 90;
  const PADDING = 20;
  const THUMB_W = 118;
  const THUMB_H = 66;
  const FOOT_H = 20;

  const totalH = HEADER_H + results.length * ROW_H + FOOT_H;
  const canvas = createCanvas(W, totalH);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, W, totalH);

  drawYTLogo(ctx, PADDING, 22);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Search Results", PADDING + 44, 43);

  const typeLabel = type === "audio" ? "Audio" : "Video";
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "13px sans-serif";
  ctx.fillText(`"${truncate(query, 40)}" — ${typeLabel}`, PADDING + 44, 62);

  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, HEADER_H - 1);
  ctx.lineTo(W - PADDING, HEADER_H - 1);
  ctx.stroke();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const y = HEADER_H + i * ROW_H;
    const mid = y + ROW_H / 2;

    if (i % 2 === 0) {
      ctx.fillStyle = "#1f1f1f";
      ctx.fillRect(0, y, W, ROW_H);
    }

    ctx.fillStyle = "#666666";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(String(i + 1), PADDING, mid + 7);

    const thumbX = PADDING + 30;
    const thumbY = y + (ROW_H - THUMB_H) / 2;

    ctx.fillStyle = "#333333";
    ctx.fillRect(thumbX, thumbY, THUMB_W, THUMB_H);

    try {
      const imgBuf = await axios.get(r.thumbnail, { responseType: "arraybuffer", timeout: 6000 });
      const img = await loadImage(Buffer.from(imgBuf.data));
      ctx.drawImage(img, thumbX, thumbY, THUMB_W, THUMB_H);
    } catch {
      ctx.fillStyle = "#444444";
      ctx.fillRect(thumbX, thumbY, THUMB_W, THUMB_H);
      ctx.fillStyle = "#888888";
      ctx.font = "11px sans-serif";
      ctx.fillText("No image", thumbX + 28, thumbY + 36);
    }

    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 1;
    ctx.strokeRect(thumbX, thumbY, THUMB_W, THUMB_H);

    const textX = thumbX + THUMB_W + 14;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(truncate(r.title, 52), textX, mid - 14);

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${truncate(r.channel?.name || "Unknown", 30)} • ${r.time || "N/A"}`, textX, mid + 4);

    ctx.fillStyle = "#777777";
    ctx.font = "12px sans-serif";
    ctx.fillText(formatViews(r.views || 0), textX, mid + 20);

    if (i < results.length - 1) {
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING + 30, y + ROW_H);
      ctx.lineTo(W - PADDING, y + ROW_H);
      ctx.stroke();
    }
  }

  return canvas.toBuffer("image/jpeg", { quality: 0.92 });
}

// ---------- ডাউনলোড ফাংশন (ফলব্যাক সহ) ----------
async function downloadWithFallback(videoID, format, quality = 3) {
  // প্রথমে নিজের API চেষ্টা করি
  try {
    const apiBase = await getApiBase();
    const { data } = await axios.get(`${apiBase}/ytDl3?link=${videoID}&format=${format}&quality=${quality}`, {
      timeout: 30000
    });
    if (data && data.downloadLink) {
      return data; // { title, downloadLink, quality }
    }
    throw new Error("No download link from primary API");
  } catch (primaryError) {
    console.warn("Primary API failed, trying fallback:", primaryError.message);
    // ফলব্যাক: ytdown.to-ভিত্তিক API (যেমন yt.js ব্যবহার করে)
    try {
      const fallbackUrl = `https://azadx69x.is-a.dev/api/ytdown?url=https://www.youtube.com/watch?v=${videoID}&type=${format === 'mp4' ? 'video' : 'audio'}`;
      const { data: dlData } = await axios.get(fallbackUrl, {
        timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      if (!dlData.success) throw new Error(dlData.error || "Fallback API failed");

      const mediaItems = dlData.result?.api?.mediaItems || [];
      if (mediaItems.length === 0) throw new Error("No media items in fallback");

      let picked = null;
      if (format === 'mp3') {
        picked = mediaItems.find(x => x.type === "Audio" && x.mediaQuality === "128K" && x.mediaExtension === "MP3")
              || mediaItems.find(x => x.type === "Audio" && x.mediaQuality === "128K")
              || mediaItems.find(x => x.type === "Audio")
              || mediaItems.find(x => x.type === "Video" && x.mediaQuality === "HD")
              || mediaItems.find(x => x.type === "Video");
      } else {
        picked = mediaItems.find(x => x.type === "Video" && x.mediaQuality === "HD")
              || mediaItems.find(x => x.type === "Video" && x.mediaQuality === "SD")
              || mediaItems.find(x => x.type === "Video")
              || mediaItems.find(x => x.type === "Audio");
      }
      if (!picked) throw new Error("No suitable media found");

      let fileUrl = picked.mediaPreviewUrl || picked.mediaUrl;
      if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("http")) {
        throw new Error("Invalid media URL");
      }

      // worker retry (যদি mediaUrl থাকে এবং "Waiting..." ফেরত দেয়)
      if (picked.mediaUrl && picked.mediaUrl.startsWith("http")) {
        try {
          const workerHeaders = {
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://app.ytdown.to/",
            "Origin": "https://app.ytdown.to",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          };
          for (let attempt = 0; attempt < 8; attempt++) {
            const workerRes = await axios.get(picked.mediaUrl, { timeout: 20000, headers: workerHeaders });
            const candidate = workerRes.data?.fileUrl;
            if (candidate && candidate !== "Waiting...") {
              fileUrl = candidate;
              break;
            }
            await new Promise(r => setTimeout(r, 3000));
          }
        } catch (_) {}
      }

      // ডাউনলোড URL থেকে ফাইল ডাউনলোড
      const fileRes = await axios.get(fileUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
        maxRedirects: 10,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.youtube.com/"
        }
      });
      const ext = format === 'mp4' ? 'mp4' : 'm4a';
      const tmpFile = path.join(os.tmpdir(), `yt_dl_${Date.now()}.${ext}`);
      fs.writeFileSync(tmpFile, Buffer.from(fileRes.data));
      if (fs.statSync(tmpFile).size === 0) throw new Error("Downloaded file is empty");

      return {
        title: dlData.result?.title || "Untitled",
        downloadLink: fileUrl,
        quality: picked.mediaQuality || "Auto",
        tmpFile // ফাইল পাথ রিটার্ন করব, যাতে বাইরে থেকে ডিলিট করা যায়
      };
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError.message);
      throw new Error(`Download failed: ${fallbackError.message}`);
    }
  }
}

// ---------- ডাউনলোড ফাইল রিড করার ফাংশন ----------
async function downloadAndGetStream(videoID, format, quality = 3) {
  const result = await downloadWithFallback(videoID, format, quality);
  if (result.tmpFile) {
    // ফলব্যাক থেকে টেম্প ফাইল পেয়েছি
    return {
      title: result.title,
      quality: result.quality,
      stream: fs.createReadStream(result.tmpFile),
      tmpFile: result.tmpFile
    };
  } else {
    // প্রাইমারি API থেকে ডাউনলোড লিংক পেয়েছি
    const pathName = `ytb_${format}_${videoID}.${format}`;
    const res = await axios.get(result.downloadLink, { responseType: "arraybuffer" });
    fs.writeFileSync(pathName, Buffer.from(res.data));
    if (fs.statSync(pathName).size === 0) throw new Error("Downloaded file is empty");
    return {
      title: result.title,
      quality: result.quality,
      stream: fs.createReadStream(pathName),
      tmpFile: pathName
    };
  }
}

// ---------- মেইন মডিউল ----------
module.exports = {
  config: {
    name: "youtube",
    version: "2.0.0",
    credits: "dipto (fixed by Ullash, upgraded by AI)",
    countDown: 5,
    hasPermssion: 0,
    description: "Download video, audio, and info from YouTube",
    category: "media",
    commandCategory: "media",
    usePrefix: true,
    prefix: true,
    usages:
      " {pn} [video|-v] [<video name>|<video link>]\n" +
      " {pn} [audio|-a] [<video name>|<video link>]\n" +
      " {pn} [info|-i] [<video name>|<video link>]\n" +
      "Example:\n" +
      "{pn} -v chipi chipi chapa chapa\n" +
      "{pn} -a chipi chipi chapa chapa\n" +
      "{pn} -i chipi chipi chapa chapa"
  },

  run: async ({ api, args, event }) => {
    const { threadID, messageID, senderID } = event;

    let action = args[0] ? args[0].toLowerCase() : '-v';

    if (!['-v', 'video', 'mp4', '-a', 'audio', 'mp3', '-i', 'info'].includes(action)) {
      args.unshift('-v');
      action = '-v';
    }

    const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    const urlYtb = args[1] ? checkurl.test(args[1]) : false;

    // ---------- ডাইরেক্ট লিংক হ্যান্ডলিং ----------
    if (urlYtb) {
      const format = ['-v', 'video', 'mp4'].includes(action) ? 'mp4'
        : ['-a', 'audio', 'mp3'].includes(action) ? 'mp3' : null;

      if (!format) return api.sendMessage('❌ Invalid format. Use -v for video or -a for audio.', threadID, messageID);

      try {
        const match = args[1].match(checkurl);
        const videoID = match ? match[1] : null;
        if (!videoID) return api.sendMessage('❌ Invalid YouTube link.', threadID, messageID);

        const { title, quality, stream, tmpFile } = await downloadAndGetStream(videoID, format, 3);

        await api.sendMessage({
          body: `• Title: ${title}\n• Quality: ${quality}`,
          attachment: stream
        }, threadID, () => {
          try { fs.unlinkSync(tmpFile); } catch (_) {}
        }, messageID);

        return;
      } catch (e) {
        console.error(e);
        return api.sendMessage(`❌ Download failed: ${e.message}`, threadID, messageID);
      }
    }

    // ---------- সার্চ কমান্ড ----------
    args.shift(); // প্রথম আর্গুমেন্ট (action) বাদ
    const keyWord = args.join(" ");
    if (!keyWord) return api.sendMessage('❌ Please provide a search keyword.', threadID, messageID);

    try {
      const apiBase = await getApiBase();
      const searchResult = (await axios.get(`${apiBase}/ytFullSearch?songName=${encodeURIComponent(keyWord)}`)).data.slice(0, 6);
      if (!searchResult.length) return api.sendMessage(`⭕ No results for keyword: ${keyWord}`, threadID, messageID);

      // ক্যানভাস ইমেজ তৈরি
      const type = ['-v', 'video', 'mp4'].includes(action) ? 'video' : 'audio';
      const imgBuffer = await generateSearchImage(searchResult, keyWord, type);
      const tmpImg = path.join(os.tmpdir(), `yt_search_${Date.now()}.jpg`);
      fs.writeFileSync(tmpImg, imgBuffer);

      const msg = `🎵 Reply with a number (1-${searchResult.length}) to download ${type === 'audio' ? 'audio 🎵' : 'video 🎬'}`;

      api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(tmpImg)
      }, threadID, (err, info) => {
        if (err) return console.error(err);
        // ইমেজ ফাইল ডিলিট (শীঘ্রই)
        setTimeout(() => { try { fs.unlinkSync(tmpImg); } catch (_) {} }, 30000);
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: senderID,
          result: searchResult,
          action
        });
      }, messageID);
    } catch (err) {
      console.error(err);
      return api.sendMessage(`❌ Search error: ${err.message}`, threadID, messageID);
    }
  },

  // ---------- রিপ্লাই হ্যান্ডলিং ----------
  handleReply: async ({ event, api, handleReply }) => {
    const { threadID, messageID, senderID, body } = event;

    if (senderID !== handleReply.author) return;
    const { result, action } = handleReply;
    const choice = parseInt(body);

    if (isNaN(choice) || choice <= 0 || choice > result.length)
      return api.sendMessage("❌ Invalid number. Please reply with a valid number.", threadID, messageID);

    const selectedVideo = result[choice - 1];
    const videoID = selectedVideo.id;

    try {
      await api.unsendMessage(handleReply.messageID);
    } catch (e) {
      console.warn("Unsend failed:", e.message);
    }

    // ---------- ডাউনলোড বা ইনফো ----------
    if (['-v', 'video', 'mp4', '-a', 'audio', 'mp3', 'music'].includes(action)) {
      const format = ['-v', 'video', 'mp4'].includes(action) ? 'mp4' : 'mp3';
      try {
        const { title, quality, stream, tmpFile } = await downloadAndGetStream(videoID, format, 3);
        await api.sendMessage({
          body: `• Title: ${title}\n• Quality: ${quality}`,
          attachment: stream
        }, threadID, () => {
          try { fs.unlinkSync(tmpFile); } catch (_) {}
        }, messageID);
      } catch (e) {
        console.error(e);
        return api.sendMessage(`❌ Download failed: ${e.message}`, threadID, messageID);
      }
    }

    if (action === '-i' || action === 'info') {
      try {
        const apiBase = await getApiBase();
        const { data } = await axios.get(`${apiBase}/ytfullinfo?videoID=${videoID}`);
        // থাম্বনেইল ডাউনলোড
        const thumbRes = await axios.get(data.thumbnail, { responseType: "arraybuffer" });
        const thumbPath = path.join(os.tmpdir(), `info_thumb_${Date.now()}.jpg`);
        fs.writeFileSync(thumbPath, Buffer.from(thumbRes.data));

        await api.sendMessage({
          body: `✨ Title: ${data.title}\n⏳ Duration: ${(data.duration / 60).toFixed(2)} mins\n📺 Resolution: ${data.resolution}\n👀 Views: ${data.view_count}\n👍 Likes: ${data.like_count}\n💬 Comments: ${data.comment_count}\n📂 Category: ${data.categories[0]}\n📢 Channel: ${data.channel}\n🧍 Uploader ID: ${data.uploader_id}\n👥 Subscribers: ${data.channel_follower_count}\n🔗 Channel URL: ${data.channel_url}\n🔗 Video URL: ${data.webpage_url}`,
          attachment: fs.createReadStream(thumbPath)
        }, threadID, () => {
          try { fs.unlinkSync(thumbPath); } catch (_) {}
        }, messageID);
      } catch (e) {
        console.error(e);
        return api.sendMessage(`❌ Info fetch failed: ${e.message}`, threadID, messageID);
      }
    }
  }
};
