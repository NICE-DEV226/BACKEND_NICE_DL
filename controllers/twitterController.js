const { downloadTwmateData } = require("../services/twitterService");

async function handleTwitterDownload(req, res) {
  const { url } = req.query;

  if (!url) {
    return res
      .status(400)
      .json({ success: false, error: "Missing 'url' query parameter." });
  }

  try {
    const data = await downloadTwmateData(url);
    console.log("🐦 Twitter response:", JSON.stringify(data, null, 2));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { handleTwitterDownload };
