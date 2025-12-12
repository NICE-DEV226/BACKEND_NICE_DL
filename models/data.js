// In-memory storage (pour production, utiliser MongoDB/PostgreSQL)
// Structure simple pour stocker reports et ratings

const data = {
  reports: [],
  ratings: [],
  stats: {
    totalDownloads: 0,
    downloadsByPlatform: {},
  },
};

// Générer un ID unique
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Reports
const addReport = (report) => {
  const newReport = {
    id: generateId(),
    ...report,
    status: 'pending', // pending, resolved, dismissed
    createdAt: new Date().toISOString(),
  };
  data.reports.unshift(newReport);
  return newReport;
};

const getReports = (status = null) => {
  if (status) {
    return data.reports.filter((r) => r.status === status);
  }
  return data.reports;
};

const updateReportStatus = (id, status) => {
  const report = data.reports.find((r) => r.id === id);
  if (report) {
    report.status = status;
    report.updatedAt = new Date().toISOString();
    return report;
  }
  return null;
};

const deleteReport = (id) => {
  const index = data.reports.findIndex((r) => r.id === id);
  if (index !== -1) {
    data.reports.splice(index, 1);
    return true;
  }
  return false;
};

// Ratings
const addRating = (rating) => {
  const newRating = {
    id: generateId(),
    ...rating,
    createdAt: new Date().toISOString(),
  };
  data.ratings.unshift(newRating);
  return newRating;
};

const getRatings = () => data.ratings;

const getAverageRating = () => {
  if (data.ratings.length === 0) return 0;
  const sum = data.ratings.reduce((acc, r) => acc + r.score, 0);
  return (sum / data.ratings.length).toFixed(1);
};

// Stats
const incrementDownload = (platform) => {
  data.stats.totalDownloads++;
  data.stats.downloadsByPlatform[platform] = (data.stats.downloadsByPlatform[platform] || 0) + 1;
};

const getStats = () => ({
  ...data.stats,
  totalReports: data.reports.length,
  pendingReports: data.reports.filter((r) => r.status === 'pending').length,
  totalRatings: data.ratings.length,
  averageRating: getAverageRating(),
});

module.exports = {
  addReport,
  getReports,
  updateReportStatus,
  deleteReport,
  addRating,
  getRatings,
  getAverageRating,
  incrementDownload,
  getStats,
};
