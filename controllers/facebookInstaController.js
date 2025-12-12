const facebookInsta = require("../services/facebookInstaService");

async function handleFacebookInstaDownload(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter." });
  }

  try {
    const data = await facebookInsta(url);
    console.log("📸 Meta response:", JSON.stringify(data, null, 2));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { handleFacebookInstaDownload };
