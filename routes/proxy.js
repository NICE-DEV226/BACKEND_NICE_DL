const express = require('express');
const axios = require('axios');
const router = express.Router();

// Proxy endpoint to download files and serve them with proper headers
router.get('/download', async (req, res) => {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing url parameter' });
  }

  try {
    const response = await axios({
      method: 'GET',
      url: decodeURIComponent(url),
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Get content type from response or default to video/mp4
    const contentType = response.headers['content-type'] || 'video/mp4';
    const contentLength = response.headers['content-length'];

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download.mp4'}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Pipe the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Proxy download error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to download file' });
  }
});

module.exports = router;
