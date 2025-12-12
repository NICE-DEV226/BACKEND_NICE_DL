const express = require('express');
const router = express.Router();

// Use in-memory storage for serverless, SQLite for local
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const storage = isServerless ? require('../models/storage') : require('../models/database');

const {
  addReport,
  getReports,
  updateReportStatus,
  deleteReport,
  addRating,
  getRatings,
  incrementDownload,
  getStats,
  addAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
  deleteAnnouncement,
  addPoll,
  getPolls,
  getActivePoll,
  addPollResponse,
  getPollResponses,
  togglePoll,
  deletePoll,
  disablePlatform,
  enablePlatform,
  getDisabledPlatforms,
  isPlatformDisabled,
} = storage;

// Middleware simple pour admin (en prod, utiliser JWT)
const ADMIN_KEY = process.env.ADMIN_KEY || 'nicedl-admin-2024';

const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// ============ PUBLIC ROUTES ============

// Soumettre un report (public)
router.post('/report', (req, res) => {
  try {
    const { url, platform, errorMessage, description, userAgent } = req.body;

    if (!url || !platform) {
      return res.status(400).json({ success: false, error: 'URL and platform are required' });
    }

    const report = addReport({
      url,
      platform,
      errorMessage: errorMessage || null,
      description: description || null,
      userAgent: userAgent || req.headers['user-agent'],
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: { id: report.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit report' });
  }
});

// Soumettre une note (public)
router.post('/rating', (req, res) => {
  try {
    const { score, comment, platform } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, error: 'Score must be between 1 and 5' });
    }

    const rating = addRating({
      score: parseInt(score),
      comment: comment || null,
      platform: platform || null,
    });

    res.status(201).json({ success: true, data: { id: rating.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit rating' });
  }
});

// Track download (public)
router.post('/track', (req, res) => {
  try {
    const { platform } = req.body;
    console.log('📊 Track download:', platform);
    if (platform) {
      incrementDownload(platform);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ success: false, error: 'Failed to track' });
  }
});

// ============ ADMIN ROUTES ============

// Get all reports
router.get('/reports', adminAuth, (req, res) => {
  try {
    const { status } = req.query;
    const reports = getReports(status || null);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get reports' });
  }
});

// Update report status
router.patch('/reports/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const report = updateReportStatus(id, status);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update report' });
  }
});

// Delete report
router.delete('/reports/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteReport(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
});

// Get all ratings
router.get('/ratings', adminAuth, (req, res) => {
  try {
    const ratings = getRatings();
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get ratings' });
  }
});

// Get stats
router.get('/stats', adminAuth, (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// ============ ANNOUNCEMENTS ============

router.get('/announcements', adminAuth, (req, res) => {
  try {
    const announcements = getAnnouncements();
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get announcements' });
  }
});

router.post('/announcements', adminAuth, (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });
    const result = addAnnouncement(message, type || 'info');
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create announcement' });
  }
});

router.patch('/announcements/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    toggleAnnouncement(id, active);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update announcement' });
  }
});

router.delete('/announcements/:id', adminAuth, (req, res) => {
  try {
    deleteAnnouncement(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete announcement' });
  }
});

// Public: Get active announcements
router.get('/public/announcements', (req, res) => {
  try {
    const announcements = getAnnouncements(true);
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get announcements' });
  }
});

// ============ POLLS ============

router.get('/polls', adminAuth, (req, res) => {
  try {
    const polls = getPolls();
    res.json({ success: true, data: polls });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get polls' });
  }
});

router.post('/polls', adminAuth, (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'Question required' });
    const result = addPoll(question);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create poll' });
  }
});

router.get('/polls/:id/responses', adminAuth, (req, res) => {
  try {
    const responses = getPollResponses(req.params.id);
    res.json({ success: true, data: responses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get responses' });
  }
});

router.patch('/polls/:id', adminAuth, (req, res) => {
  try {
    const { active } = req.body;
    togglePoll(req.params.id, active);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update poll' });
  }
});

router.delete('/polls/:id', adminAuth, (req, res) => {
  try {
    deletePoll(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete poll' });
  }
});

// Public: Get active poll
router.get('/public/poll', (req, res) => {
  try {
    const poll = getActivePoll();
    res.json({ success: true, data: poll });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get poll' });
  }
});

// Public: Submit poll response
router.post('/public/poll/:id/respond', (req, res) => {
  try {
    const { response } = req.body;
    if (!response) return res.status(400).json({ success: false, error: 'Response required' });
    addPollResponse(req.params.id, response);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit response' });
  }
});

// ============ DISABLED PLATFORMS ============

router.get('/platforms', adminAuth, (req, res) => {
  try {
    const disabled = getDisabledPlatforms();
    res.json({ success: true, data: disabled });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get platforms' });
  }
});

router.post('/platforms/disable', adminAuth, (req, res) => {
  try {
    const { platform, reason } = req.body;
    if (!platform) return res.status(400).json({ success: false, error: 'Platform required' });
    disablePlatform(platform, reason || '');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to disable platform' });
  }
});

router.post('/platforms/enable', adminAuth, (req, res) => {
  try {
    const { platform } = req.body;
    if (!platform) return res.status(400).json({ success: false, error: 'Platform required' });
    enablePlatform(platform);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to enable platform' });
  }
});

// Public: Get disabled platforms
router.get('/public/disabled-platforms', (req, res) => {
  try {
    const disabled = getDisabledPlatforms();
    res.json({ success: true, data: disabled });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get disabled platforms' });
  }
});

module.exports = router;
