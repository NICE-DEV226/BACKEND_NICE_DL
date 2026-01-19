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

    // Get content type from response or default to application/octet-stream
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const contentLength = response.headers['content-length'];

    // Map content types to extensions for automatic correction
    const typeToExt = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav'
    };

    let finalFilename = filename || 'download';
    // If filename has no extension or wrong extension, fix it based on contentType
    const currentExt = finalFilename.split('.').pop()?.toLowerCase();
    const expectedExt = typeToExt[contentType.split(';')[0].toLowerCase()];

    if (expectedExt && currentExt !== expectedExt) {
      if (currentExt === 'mp4' && contentType.startsWith('image/')) {
        // Specifically fix the case reported by the user: image saved as mp4
        finalFilename = finalFilename.replace(/\.mp4$/i, `.${expectedExt}`);
      } else if (!finalFilename.includes('.')) {
        finalFilename += `.${expectedExt}`;
      }
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
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
