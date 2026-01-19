const axios = require("axios");

/**
 * Downloads TikTok video/audio data using tikwm.com API
 * @param {string} videoUrl - The TikTok video URL
 * @returns {Promise<object>} - Video data with download links
 */
async function fetchTikTokData(videoUrl) {
  const endpoint = "https://www.tikwm.com/api/";

  try {
    const res = await axios.get(endpoint, {
      params: { url: videoUrl },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      timeout: 20000,
    });

    const response = res.data;

    if (response.code !== 0 || !response.data) {
      throw new Error(
        `TikTok API error: ${response.msg || "Failed to fetch video data"}`
      );
    }

    const data = response.data;

    // Build download links
    const downloads = [];

    // Video without watermark (HD)
    if (data.hdplay) {
      downloads.push({
        text: "Download HD (No Watermark)",
        url: data.hdplay,
      });
    }

    // Video without watermark (Standard)
    if (data.play) {
      downloads.push({
        text: "Download MP4 (No Watermark)",
        url: data.play,
      });
    }

    // Video with watermark
    if (data.wmplay) {
      downloads.push({
        text: "Download (With Watermark)",
        url: data.wmplay,
      });
    }

    // Audio/Music
    if (data.music) {
      downloads.push({
        text: "Download Audio (MP3)",
        url: data.music,
      });
    }

    // Handle photo slideshows
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      data.images.forEach((img, index) => {
        downloads.push({
          text: `Photo ${index + 1}`,
          url: img,
        });
      });
    }

    if (downloads.length === 0) {
      throw new Error("No download links found for this TikTok video.");
    }

    return {
      status: "ok",
      title: data.title || null,
      thumbnail: data.cover || data.origin_cover || null,
      author: data.author?.nickname || null,
      authorUsername: data.author?.unique_id || null,
      duration: data.duration || null,
      downloads,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`TikTok API HTTP failed: ${error.response.status}`);
    }
    throw new Error(`TikTok download failed: ${error.message}`);
  }
}

module.exports = { fetchTikTokData };
