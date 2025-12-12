/**
 * Simple in-memory storage for serverless deployment
 * For production with persistence, use:
 * - Vercel KV (Redis)
 * - PlanetScale (MySQL)
 * - Supabase (PostgreSQL)
 * - MongoDB Atlas
 */

const data = {
  reports: [],
  ratings: [],
  announcements: [],
  polls: [],
  pollResponses: [],
  disabledPlatforms: [],
  stats: { totalDownloads: 0, downloadsByPlatform: {} },
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Reports
const addReport = (report) => {
  const newReport = { id: generateId(), ...report, status: 'pending', createdAt: new Date().toISOString() };
  data.reports.unshift(newReport);
  return { id: newReport.id };
};
const getReports = (status) => status ? data.reports.filter(r => r.status === status) : data.reports;
const updateReportStatus = (id, status) => {
  const report = data.reports.find(r => r.id === id);
  if (report) { report.status = status; report.updatedAt = new Date().toISOString(); }
  return report;
};
const deleteReport = (id) => {
  const idx = data.reports.findIndex(r => r.id === id);
  if (idx !== -1) { data.reports.splice(idx, 1); return true; }
  return false;
};

// Ratings
const addRating = (rating) => {
  const newRating = { id: generateId(), ...rating, createdAt: new Date().toISOString() };
  data.ratings.unshift(newRating);
  return { id: newRating.id };
};
const getRatings = () => data.ratings;
const getAverageRating = () => {
  if (data.ratings.length === 0) return '0';
  return (data.ratings.reduce((sum, r) => sum + r.score, 0) / data.ratings.length).toFixed(1);
};

// Stats
const incrementDownload = (platform) => {
  data.stats.totalDownloads++;
  data.stats.downloadsByPlatform[platform] = (data.stats.downloadsByPlatform[platform] || 0) + 1;
};
const getStats = () => ({
  ...data.stats,
  totalReports: data.reports.length,
  pendingReports: data.reports.filter(r => r.status === 'pending').length,
  totalRatings: data.ratings.length,
  averageRating: getAverageRating(),
});

// Announcements
const addAnnouncement = (message, type = 'info') => {
  const a = { id: generateId(), message, type, active: true, createdAt: new Date().toISOString() };
  data.announcements.unshift(a);
  return { id: a.id };
};
const getAnnouncements = (activeOnly = false) => activeOnly ? data.announcements.filter(a => a.active) : data.announcements;
const toggleAnnouncement = (id, active) => {
  const a = data.announcements.find(x => x.id === id);
  if (a) a.active = active;
  return true;
};
const deleteAnnouncement = (id) => {
  const idx = data.announcements.findIndex(a => a.id === id);
  if (idx !== -1) { data.announcements.splice(idx, 1); return true; }
  return false;
};

// Polls
const addPoll = (question) => {
  const p = { id: generateId(), question, active: true, createdAt: new Date().toISOString() };
  data.polls.unshift(p);
  return { id: p.id };
};
const getPolls = () => data.polls.map(p => ({
  ...p,
  responseCount: data.pollResponses.filter(r => r.pollId === p.id).length
}));
const getActivePoll = () => data.polls.find(p => p.active) || null;
const addPollResponse = (pollId, response) => {
  const r = { id: generateId(), pollId, response, createdAt: new Date().toISOString() };
  data.pollResponses.unshift(r);
  return { id: r.id };
};
const getPollResponses = (pollId) => data.pollResponses.filter(r => r.pollId === pollId);
const togglePoll = (id, active) => {
  const p = data.polls.find(x => x.id === id);
  if (p) p.active = active;
  return true;
};
const deletePoll = (id) => {
  data.pollResponses = data.pollResponses.filter(r => r.pollId !== id);
  const idx = data.polls.findIndex(p => p.id === id);
  if (idx !== -1) { data.polls.splice(idx, 1); return true; }
  return false;
};

// Disabled Platforms
const disablePlatform = (platform, reason = '') => {
  const existing = data.disabledPlatforms.find(p => p.platform === platform);
  if (existing) { existing.reason = reason; }
  else { data.disabledPlatforms.push({ platform, reason, disabledAt: new Date().toISOString() }); }
  return true;
};
const enablePlatform = (platform) => {
  data.disabledPlatforms = data.disabledPlatforms.filter(p => p.platform !== platform);
  return true;
};
const getDisabledPlatforms = () => data.disabledPlatforms;
const isPlatformDisabled = (platform) => data.disabledPlatforms.some(p => p.platform === platform);

// Init (no-op for in-memory)
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
