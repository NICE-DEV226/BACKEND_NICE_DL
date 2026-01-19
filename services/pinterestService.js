const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetches Pinterest video or image metadata directly from the source page
 * @param {string} url - The Pinterest URL (pin.it or pinterest.com)
 * @returns {Promise<object>} - Media data with download links
 */
async function fetchPinterestMedia(url) {
  try {
    // 1. Follow redirects (important for pin.it shortened links)
    const initialResponse = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      maxRedirects: 5,
    });

    const initialUrl = initialResponse.request.res.responseUrl || initialResponse.config.url;
    let finalUrl = initialUrl;

    // 2. Clean Pin URL (remove /sent/ and query params to get the base Pin page)
    const pinMatch = finalUrl.match(/pinterest\.com\/pin\/(\d+)/);
    if (pinMatch) {
      finalUrl = `https://www.pinterest.com/pin/${pinMatch[1]}/`;
    }

    // 3. Fetch the cleaned page with a mobile User-Agent
    const response = await axios.get(finalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 4. Extract Metadata
    const title = $('meta[property="og:title"]').attr('content') ||
      $('title').text().replace('Pinterest', '').trim() ||
      "Pinterest Media";

    let thumbnail = $('meta[property="og:image"]').attr('content');

    // If og:image is missing, try to find the main pin image
    if (!thumbnail) {
      thumbnail = $('img[src*="pinimg.com/originals/"]').first().attr('src') ||
        $('img[src*="pinimg.com/736x/"]').first().attr('src');
    }

    const downloads = [];
    let mediaType = "image";

    // 5. Intelligent Video Detection
    // We only consider it a video if 'video_list' is found in the HTML
    // and we have v1.pinimg.com video links.
    const hasVideoList = html.includes('video_list') || html.includes('videoPlayer');
    const videoMatches = html.match(/https:\/\/v1\.pinimg\.com\/videos\/[^\s\"']+\.mp4/g);

    if (hasVideoList && videoMatches && videoMatches.length > 0) {
      mediaType = "video";
      const uniqueVideos = [...new Set(videoMatches)];
      uniqueVideos.forEach((videoUrl, index) => {
        let quality = "Video";
        if (videoUrl.includes("_720w")) quality = "Video HD (720p)";
        else if (videoUrl.includes("_v720P")) quality = "Video HD (720p)";
        else if (videoUrl.includes("_480p")) quality = "Video (480p)";
        else if (videoUrl.includes("_240p")) quality = "Video (240p)";

        downloads.push({
          quality: uniqueVideos.length > 1 ? `${quality} ${index + 1}` : quality,
          format: "mp4",
          url: videoUrl,
        });
      });
    }

    // 6. Image Extraction (Original quality)
    if (thumbnail) {
      let imageUrl = thumbnail;
      if (imageUrl.includes('/736x/')) {
        imageUrl = imageUrl.replace('/736x/', '/originals/');
      }

      downloads.push({
        quality: "Original Image",
        format: imageUrl.split('.').pop().split('?')[0] || "jpg",
        url: imageUrl,
      });
    }

    if (downloads.length === 0) {
      throw new Error("No media links found for this Pinterest URL.");
    }

    // Sort: Videos first
    downloads.sort((a, b) => (a.format === "mp4" ? -1 : 1));

    return {
      status: "ok",
      mediaType,
      title: title || "Pinterest Media",
      thumbnail,
      downloads,
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error("Pinterest URL not found. Please check the link.");
    }
    throw new Error("Failed to extract Pinterest media: " + error.message);
  }
}

module.exports = { fetchPinterestMedia };
