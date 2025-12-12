const axios = require("axios");

async function downloadTwitterData(twitterUrl) {
  try {
    // Use ssstwitter API
    const response = await axios.get("https://ssstwitter.com/api/v1/twitter", {
      params: { url: twitterUrl },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      timeout: 30000,
    });

    if (response.data && response.data.media) {
      return response.data.media.map((item) => ({
        quality: item.quality || "HD",
        type: item.type || "video",
        url: item.url,
      }));
    }

    // Fallback: try twitsave
    const twitsaveResponse = await axios.post(
      "https://twitsave.com/info",
      `url=${encodeURIComponent(twitterUrl)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
        timeout: 30000,
      }
    );

    // Parse response if needed
    const data = twitsaveResponse.data;
    if (typeof data === "string") {
      // Try to extract video URLs from HTML
      const urlMatches = data.match(/https:\/\/[^"'\s]+\.mp4[^"'\s]*/g);
      if (urlMatches && urlMatches.length > 0) {
        return [...new Set(urlMatches)].map((url, index) => ({
          quality: index === 0 ? "HD" : "SD",
          type: "video",
          url: url.replace(/&amp;/g, "&"),
        }));
      }
    }

    return [];
  } catch (err) {
    console.error("Twitter service error:", err.message);
    throw new Error("Twitter download failed: " + err.message);
  }
}

// Alternative: Use RapidAPI Twitter downloader (requires API key)
async function downloadTwmateData(twitterUrl) {
  const formData = `page=${encodeURIComponent(twitterUrl)}&ftype=all&ajax=1`;

  try {
    const { data } = await axios.post("https://twmate.com/", formData, {
      headers: {
        accept: "*/*",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: "https://twmate.com/",
        "user-agent": "Mozilla/5.0",
      },
      timeout: 30000,
    });

    const cheerio = require("cheerio");
    const $ = cheerio.load(data);
    const results = [];

    $("table.files-table tbody tr").each((_, row) => {
      const quality = $(row).find("td").eq(0).text().trim();
      const type = $(row).find("td").eq(1).text().trim();
      const url = $(row).find("td a").attr("href");

      if (quality && type && url) {
        results.push({ quality, type, url });
      }
    });

    return results;
  } catch (err) {
    console.error("Twmate error:", err.message);
    return [];
  }
}

// Main function that tries multiple services
async function fetchTwitterVideo(twitterUrl) {
  // Try twmate first
  let results = await downloadTwmateData(twitterUrl);
  
  if (results.length === 0) {
    // Try alternative service
    results = await downloadTwitterData(twitterUrl);
  }

  return results;
}

module.exports = { downloadTwmateData: fetchTwitterVideo };
