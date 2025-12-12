const { fetchLinkedinData } = require("../services/linkedinService");

async function handleLinkedinDownload(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, error: "Missing 'url' query parameter." });
    }

    const data = await fetchLinkedinData(url);
    console.log("💼 LinkedIn response:", JSON.stringify(data, null, 2));
    
    // Add a title if not present
    if (!data.title) {
      data.title = 'LinkedIn Video';
    }
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { handleLinkedinDownload };
