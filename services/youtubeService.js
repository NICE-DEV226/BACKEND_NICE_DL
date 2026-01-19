const ytdl = require("@distube/ytdl-core");

/**
 * Fetches YouTube video metadata and download formats using @distube/ytdl-core
 * @param {string} url - The YouTube video URL
 * @returns {Promise<object>} - Video data with formats
 */
async function fetchYouTubeData(url) {
  try {
    if (!ytdl.validateURL(url)) {
      throw new Error("Invalid YouTube URL");
    }

    const info = await ytdl.getInfo(url);

    // Extract basic info
    const { videoDetails, formats } = info;

    // Process formats to match the expected interface
    // filter to get formats with both video and audio, or just audio, or just video
    const processedFormats = formats
      .filter(f => f.url) // ensure URL exists
      .map(f => {
        let type = "video";
        if (!f.hasVideo && f.hasAudio) type = "audio";
        else if (f.hasVideo && !f.hasAudio) type = "video_only";

        return {
          type: type,
          quality: f.qualityLabel || (f.audioBitrate ? `${f.audioBitrate}kbps` : "unknown"),
          extension: f.container || "unknown",
          url: f.url,
          mimeType: f.mimeType,
          size: f.contentLength ? parseInt(f.contentLength) : null
        };
      });

    return {
      title: videoDetails.title,
      thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || null,
      duration: parseInt(videoDetails.lengthSeconds),
      author: videoDetails.author.name,
      viewCount: videoDetails.viewCount,
      formats: processedFormats,
    };
  } catch (err) {
    throw new Error(`YouTube extraction failed: ${err.message}`);
  }
}

module.exports = { fetchYouTubeData };
