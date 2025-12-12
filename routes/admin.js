const express = require('express');
const router = express.Router();

// Use Vercel KV for serverless with KV, in-memory otherwise, SQLite for local
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
const storage = isServerless 
  ? (hasKV ? require('../models/kvStorage') : require('../models/storage'))
  : require('../models/database');

const {
  addReport, getReports, updateReportStatus, deleteReport,
  addRating, getRatings, incrementDownload, getStats,
  addAnnouncement, getAnnouncements, toggleAnnouncement, deleteAnnouncement,
  addPoll, getPolls, getActivePoll, addPollResponse, getPollResponses, togglePoll, deletePoll,
  disablePlatform, enablePlatform, getDisabledPlatforms,
} = storage;

// Middleware admin auth
const ADMIN_KEY = process.env.ADMIN_KEY || 'nicedl-admin-2024';
const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ success: false, error: 'Unauthorized' });
  next();
};

// ============ PUBLIC ROUTES ============

router.post('/report', async (req, res) => {
  try {
    const { url, platform, errorMessage, description, userAgent } = req.body;
    if (!url || !platform) return res.status(400).json({ success: false, error: 'URL and platform required' });
    const report = await addReport({ url, platform, errorMessage: errorMessage || null, description: description || null, userAgent: userAgent || req.headers['user-agent'], ip: req.ip });
    res.status(201).json({ success: true, data: { id: report.id } });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to submit report' }); }
});

router.post('/rating', async (req, res) => {
  try {
    const { score, comment, platform } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ success: false, error: 'Score must be 1-5' });
    const rating = await addRating({ score: parseInt(score), comment: comment || null, platform: platform || null });
    res.status(201).json({ success: true, data: { id: rating.id } });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to submit rating' }); }
});

router.post('/track', async (req, res) => {
  try {
    const { platform } = req.body;
    if (platform) await incrementDownload(platform);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to track' }); }
});


// ============ ADMIN ROUTES ============

router.get('/reports', adminAuth, async (req, res) => {
  try {
    const reports = await getReports(req.query.status || null);
    res.json({ success: true, data: reports });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get reports' }); }
});

router.patch('/reports/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
    const report = await updateReportStatus(req.params.id, status);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to update report' }); }
});

router.delete('/reports/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await deleteReport(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Report not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to delete report' }); }
});

router.get('/ratings', adminAuth, async (req, res) => {
  try {
    const ratings = await getRatings();
    res.json({ success: true, data: ratings });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get ratings' }); }
});

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get stats' }); }
});

// ============ ANNOUNCEMENTS ============

router.get('/announcements', adminAuth, async (req, res) => {
  try {
    const announcements = await getAnnouncements();
    res.json({ success: true, data: announcements });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get announcements' }); }
});

router.post('/announcements', adminAuth, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });
    const result = await addAnnouncement(message, type || 'info');
    res.status(201).json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to create announcement' }); }
});

router.patch('/announcements/:id', adminAuth, async (req, res) => {
  try {
    await toggleAnnouncement(req.params.id, req.body.active);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to update announcement' }); }
});

router.delete('/announcements/:id', adminAuth, async (req, res) => {
  try {
    await deleteAnnouncement(req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to delete announcement' }); }
});

router.get('/public/announcements', async (req, res) => {
  try {
    const announcements = await getAnnouncements(true);
    res.json({ success: true, data: announcements });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get announcements' }); }
});


// ============ POLLS ============

router.get('/polls', adminAuth, async (req, res) => {
  try {
    const polls = await getPolls();
    res.json({ success: true, data: polls });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get polls' }); }
});

router.post('/polls', adminAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'Question required' });
    const result = await addPoll(question);
    res.status(201).json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to create poll' }); }
});

router.get('/polls/:id/responses', adminAuth, async (req, res) => {
  try {
    const responses = await getPollResponses(req.params.id);
    res.json({ success: true, data: responses });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get responses' }); }
});

router.patch('/polls/:id', adminAuth, async (req, res) => {
  try {
    await togglePoll(req.params.id, req.body.active);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to update poll' }); }
});

router.delete('/polls/:id', adminAuth, async (req, res) => {
  try {
    await deletePoll(req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to delete poll' }); }
});

router.get('/public/poll', async (req, res) => {
  try {
    const poll = await getActivePoll();
    res.json({ success: true, data: poll });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get poll' }); }
});

router.post('/public/poll/:id/respond', async (req, res) => {
  try {
    const { response } = req.body;
    if (!response) return res.status(400).json({ success: false, error: 'Response required' });
    await addPollResponse(req.params.id, response);
    res.status(201).json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to submit response' }); }
});

// ============ DISABLED PLATFORMS ============

router.get('/platforms', adminAuth, async (req, res) => {
  try {
    const disabled = await getDisabledPlatforms();
    res.json({ success: true, data: disabled });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get platforms' }); }
});

router.post('/platforms/disable', adminAuth, async (req, res) => {
  try {
    const { platform, reason } = req.body;
    if (!platform) return res.status(400).json({ success: false, error: 'Platform required' });
    await disablePlatform(platform, reason || '');
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to disable platform' }); }
});

router.post('/platforms/enable', adminAuth, async (req, res) => {
  try {
    const { platform } = req.body;
    if (!platform) return res.status(400).json({ success: false, error: 'Platform required' });
    await enablePlatform(platform);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to enable platform' }); }
});

router.get('/public/disabled-platforms', async (req, res) => {
  try {
    const disabled = await getDisabledPlatforms();
    res.json({ success: true, data: disabled });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to get disabled platforms' }); }
});

module.exports = router;
