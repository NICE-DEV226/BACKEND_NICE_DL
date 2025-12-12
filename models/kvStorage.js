/**
 * Vercel KV Storage for serverless deployment
 * Requires: @vercel/kv package and KV database connected to project
 */

const { kv } = require('@vercel/kv');

const KEYS = {
  REPORTS: 'nicedl:reports',
  RATINGS: 'nicedl:ratings',
  ANNOUNCEMENTS: 'nicedl:announcements',
  POLLS: 'nicedl:polls',
  POLL_RESPONSES: 'nicedl:poll_responses',
  DISABLED_PLATFORMS: 'nicedl:disabled_platforms',
  STATS: 'nicedl:stats',
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Helper to get/set JSON data
const getData = async (key, defaultValue = []) => {
  try {
    const data = await kv.get(key);
    return data || defaultValue;
  } catch (err) {
    console.error(`KV get error for ${key}:`, err);
    return defaultValue;
  }
};

const setData = async (key, value) => {
  try {
    await kv.set(key, value);
    return true;
  } catch (err) {
    console.error(`KV set error for ${key}:`, err);
    return false;
  }
};

// Reports
const addReport = async (report) => {
  const reports = await getData(KEYS.REPORTS, []);
  const newReport = { id: generateId(), ...report, status: 'pending', createdAt: new Date().toISOString() };
  reports.unshift(newReport);
  await setData(KEYS.REPORTS, reports);
  return { id: newReport.id };
};

const getReports = async (status) => {
  const reports = await getData(KEYS.REPORTS, []);
  return status ? reports.filter(r => r.status === status) : reports;
};

const updateReportStatus = async (id, status) => {
  const reports = await getData(KEYS.REPORTS, []);
  const report = reports.find(r => r.id === id);
  if (report) {
    report.status = status;
    report.updatedAt = new Date().toISOString();
    await setData(KEYS.REPORTS, reports);
  }
  return report;
};

const deleteReport = async (id) => {
  const reports = await getData(KEYS.REPORTS, []);
  const idx = reports.findIndex(r => r.id === id);
  if (idx !== -1) {
    reports.splice(idx, 1);
    await setData(KEYS.REPORTS, reports);
    return true;
  }
  return false;
};

// Ratings
const addRating = async (rating) => {
  const ratings = await getData(KEYS.RATINGS, []);
  const newRating = { id: generateId(), ...rating, createdAt: new Date().toISOString() };
  ratings.unshift(newRating);
  await setData(KEYS.RATINGS, ratings);
  return { id: newRating.id };
};

const getRatings = async () => getData(KEYS.RATINGS, []);

const getAverageRating = async () => {
  const ratings = await getData(KEYS.RATINGS, []);
  if (ratings.length === 0) return '0';
  return (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1);
};

// Stats
const incrementDownload = async (platform) => {
  const stats = await getData(KEYS.STATS, { totalDownloads: 0, downloadsByPlatform: {} });
  stats.totalDownloads++;
  stats.downloadsByPlatform[platform] = (stats.downloadsByPlatform[platform] || 0) + 1;
  await setData(KEYS.STATS, stats);
};

const getStats = async () => {
  const [stats, reports, ratings] = await Promise.all([
    getData(KEYS.STATS, { totalDownloads: 0, downloadsByPlatform: {} }),
    getData(KEYS.REPORTS, []),
    getData(KEYS.RATINGS, []),
  ]);
  
  const avgRating = ratings.length === 0 ? '0' : (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1);
  
  return {
    ...stats,
    totalReports: reports.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    totalRatings: ratings.length,
    averageRating: avgRating,
  };
};


// Announcements
const addAnnouncement = async (message, type = 'info') => {
  const announcements = await getData(KEYS.ANNOUNCEMENTS, []);
  const a = { id: generateId(), message, type, active: true, createdAt: new Date().toISOString() };
  announcements.unshift(a);
  await setData(KEYS.ANNOUNCEMENTS, announcements);
  return { id: a.id };
};

const getAnnouncements = async (activeOnly = false) => {
  const announcements = await getData(KEYS.ANNOUNCEMENTS, []);
  return activeOnly ? announcements.filter(a => a.active) : announcements;
};

const toggleAnnouncement = async (id, active) => {
  const announcements = await getData(KEYS.ANNOUNCEMENTS, []);
  const a = announcements.find(x => x.id === id);
  if (a) {
    a.active = active;
    await setData(KEYS.ANNOUNCEMENTS, announcements);
  }
  return true;
};

const deleteAnnouncement = async (id) => {
  const announcements = await getData(KEYS.ANNOUNCEMENTS, []);
  const idx = announcements.findIndex(a => a.id === id);
  if (idx !== -1) {
    announcements.splice(idx, 1);
    await setData(KEYS.ANNOUNCEMENTS, announcements);
    return true;
  }
  return false;
};

// Polls
const addPoll = async (question) => {
  const polls = await getData(KEYS.POLLS, []);
  const p = { id: generateId(), question, active: true, createdAt: new Date().toISOString() };
  polls.unshift(p);
  await setData(KEYS.POLLS, polls);
  return { id: p.id };
};

const getPolls = async () => {
  const [polls, responses] = await Promise.all([
    getData(KEYS.POLLS, []),
    getData(KEYS.POLL_RESPONSES, []),
  ]);
  return polls.map(p => ({
    ...p,
    responseCount: responses.filter(r => r.pollId === p.id).length
  }));
};

const getActivePoll = async () => {
  const polls = await getData(KEYS.POLLS, []);
  return polls.find(p => p.active) || null;
};

const addPollResponse = async (pollId, response) => {
  const responses = await getData(KEYS.POLL_RESPONSES, []);
  const r = { id: generateId(), pollId, response, createdAt: new Date().toISOString() };
  responses.unshift(r);
  await setData(KEYS.POLL_RESPONSES, responses);
  return { id: r.id };
};

const getPollResponses = async (pollId) => {
  const responses = await getData(KEYS.POLL_RESPONSES, []);
  return responses.filter(r => r.pollId === pollId);
};

const togglePoll = async (id, active) => {
  const polls = await getData(KEYS.POLLS, []);
  const p = polls.find(x => x.id === id);
  if (p) {
    p.active = active;
    await setData(KEYS.POLLS, polls);
  }
  return true;
};

const deletePoll = async (id) => {
  const [polls, responses] = await Promise.all([
    getData(KEYS.POLLS, []),
    getData(KEYS.POLL_RESPONSES, []),
  ]);
  
  const filteredResponses = responses.filter(r => r.pollId !== id);
  const idx = polls.findIndex(p => p.id === id);
  
  if (idx !== -1) {
    polls.splice(idx, 1);
    await Promise.all([
      setData(KEYS.POLLS, polls),
      setData(KEYS.POLL_RESPONSES, filteredResponses),
    ]);
    return true;
  }
  return false;
};

// Disabled Platforms
const disablePlatform = async (platform, reason = '') => {
  const platforms = await getData(KEYS.DISABLED_PLATFORMS, []);
  const existing = platforms.find(p => p.platform === platform);
  if (existing) {
    existing.reason = reason;
  } else {
    platforms.push({ platform, reason, disabledAt: new Date().toISOString() });
  }
  await setData(KEYS.DISABLED_PLATFORMS, platforms);
  return true;
};

const enablePlatform = async (platform) => {
  const platforms = await getData(KEYS.DISABLED_PLATFORMS, []);
  const filtered = platforms.filter(p => p.platform !== platform);
  await setData(KEYS.DISABLED_PLATFORMS, filtered);
  return true;
};

const getDisabledPlatforms = async () => getData(KEYS.DISABLED_PLATFORMS, []);

const isPlatformDisabled = async (platform) => {
  const platforms = await getData(KEYS.DISABLED_PLATFORMS, []);
  return platforms.some(p => p.platform === platform);
};

// Init (no-op for KV)
const initDb = async () => Promise.resolve();

module.exports = {
  initDb,
  addReport, getReports, updateReportStatus, deleteReport,
  addRating, getRatings, getAverageRating,
  incrementDownload, getStats,
  addAnnouncement, getAnnouncements, toggleAnnouncement, deleteAnnouncement,
  addPoll, getPolls, getActivePoll, addPollResponse, getPollResponses, togglePoll, deletePoll,
  disablePlatform, enablePlatform, getDisabledPlatforms, isPlatformDisabled,
};
