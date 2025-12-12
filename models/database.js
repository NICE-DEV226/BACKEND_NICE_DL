const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data.db');

let db = null;

// Initialiser la base de données
const initDb = async () => {
  if (db) return db;

  const SQL = await initSqlJs();

  // Charger la DB existante ou en créer une nouvelle
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Créer les tables
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      platform TEXT NOT NULL,
      error_message TEXT,
      description TEXT,
      user_agent TEXT,
      ip TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      comment TEXT,
      platform TEXT,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY,
      total_downloads INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS downloads_by_platform (
      platform TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )
  `);

  // Announcements table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      active INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  // Polls table
  db.run(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  // Poll responses table
  db.run(`
    CREATE TABLE IF NOT EXISTS poll_responses (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT
    )
  `);

  // Disabled platforms table
  db.run(`
    CREATE TABLE IF NOT EXISTS disabled_platforms (
      platform TEXT PRIMARY KEY,
      reason TEXT,
      disabled_at TEXT
    )
  `);

  // Init stats row
  const statsExists = db.exec('SELECT * FROM stats WHERE id = 1');
  if (statsExists.length === 0 || statsExists[0].values.length === 0) {
    db.run('INSERT INTO stats (id, total_downloads) VALUES (1, 0)');
  }

  saveDb();
  return db;
};

// Sauvegarder la DB sur disque
const saveDb = () => {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
};

// Générer un ID unique
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// ============ REPORTS ============

const addReport = (report) => {
  if (!db) throw new Error('Database not initialized');
  
  const id = generateId();
  const now = new Date().toISOString();
  
  db.run(
    `INSERT INTO reports (id, url, platform, error_message, description, user_agent, ip, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, report.url, report.platform, report.errorMessage, report.description, report.userAgent, report.ip, now]
  );
  
  saveDb();
  return { id };
};

const getReports = (status = null) => {
  if (!db) throw new Error('Database not initialized');
  
  let result;
  if (status) {
    result = db.exec('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC', [status]);
  } else {
    result = db.exec('SELECT * FROM reports ORDER BY created_at DESC');
  }
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return formatReport(obj);
  });
};

const updateReportStatus = (id, status) => {
  if (!db) throw new Error('Database not initialized');
  
  const now = new Date().toISOString();
  db.run('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
  saveDb();
  
  const result = db.exec('SELECT * FROM reports WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return formatReport(obj);
};

const deleteReport = (id) => {
  if (!db) throw new Error('Database not initialized');
  
  const before = db.exec('SELECT COUNT(*) FROM reports WHERE id = ?', [id]);
  const countBefore = before[0]?.values[0]?.[0] || 0;
  
  db.run('DELETE FROM reports WHERE id = ?', [id]);
  saveDb();
  
  return countBefore > 0;
};

const formatReport = (row) => ({
  id: row.id,
  url: row.url,
  platform: row.platform,
  errorMessage: row.error_message,
  description: row.description,
  userAgent: row.user_agent,
  ip: row.ip,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============ RATINGS ============

const addRating = (rating) => {
  if (!db) throw new Error('Database not initialized');
  
  const id = generateId();
  const now = new Date().toISOString();
  
  db.run(
    'INSERT INTO ratings (id, score, comment, platform, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, rating.score, rating.comment, rating.platform, now]
  );
  
  saveDb();
  return { id };
};

const getRatings = () => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.exec('SELECT * FROM ratings ORDER BY created_at DESC');
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id,
      score: obj.score,
      comment: obj.comment,
      platform: obj.platform,
      createdAt: obj.created_at,
    };
  });
};

const getAverageRating = () => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.exec('SELECT AVG(score) as avg FROM ratings');
  if (result.length === 0 || result[0].values.length === 0) return '0';
  
  const avg = result[0].values[0][0];
  return avg ? avg.toFixed(1) : '0';
};

// ============ STATS ============

const incrementDownload = (platform) => {
  if (!db) throw new Error('Database not initialized');
  
  db.run('UPDATE stats SET total_downloads = total_downloads + 1 WHERE id = 1');
  
  // Check if platform exists
  const exists = db.exec('SELECT count FROM downloads_by_platform WHERE platform = ?', [platform]);
  
  if (exists.length === 0 || exists[0].values.length === 0) {
    db.run('INSERT INTO downloads_by_platform (platform, count) VALUES (?, 1)', [platform]);
  } else {
    db.run('UPDATE downloads_by_platform SET count = count + 1 WHERE platform = ?', [platform]);
  }
  
  saveDb();
};

const getStats = () => {
  if (!db) throw new Error('Database not initialized');
  
  const statsResult = db.exec('SELECT total_downloads FROM stats WHERE id = 1');
  const totalDownloads = statsResult[0]?.values[0]?.[0] || 0;
  
  const platformResult = db.exec('SELECT platform, count FROM downloads_by_platform ORDER BY count DESC');
  const downloadsByPlatform = {};
  if (platformResult.length > 0) {
    platformResult[0].values.forEach(([platform, count]) => {
      downloadsByPlatform[platform] = count;
    });
  }
  
  const totalReportsResult = db.exec('SELECT COUNT(*) FROM reports');
  const totalReports = totalReportsResult[0]?.values[0]?.[0] || 0;
  
  const pendingResult = db.exec('SELECT COUNT(*) FROM reports WHERE status = "pending"');
  const pendingReports = pendingResult[0]?.values[0]?.[0] || 0;
  
  const totalRatingsResult = db.exec('SELECT COUNT(*) FROM ratings');
  const totalRatings = totalRatingsResult[0]?.values[0]?.[0] || 0;
  
  return {
    totalDownloads,
    downloadsByPlatform,
    totalReports,
    pendingReports,
    totalRatings,
    averageRating: getAverageRating(),
  };
};

// ============ ANNOUNCEMENTS ============

const addAnnouncement = (message, type = 'info') => {
  if (!db) throw new Error('Database not initialized');
  const id = generateId();
  const now = new Date().toISOString();
  db.run('INSERT INTO announcements (id, message, type, active, created_at) VALUES (?, ?, ?, 1, ?)', [id, message, type, now]);
  saveDb();
  return { id };
};

const getAnnouncements = (activeOnly = false) => {
  if (!db) throw new Error('Database not initialized');
  const query = activeOnly ? 'SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC' : 'SELECT * FROM announcements ORDER BY created_at DESC';
  const result = db.exec(query);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return { id: obj.id, message: obj.message, type: obj.type, active: obj.active === 1, createdAt: obj.created_at };
  });
};

const toggleAnnouncement = (id, active) => {
  if (!db) throw new Error('Database not initialized');
  db.run('UPDATE announcements SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
  saveDb();
  return true;
};

const deleteAnnouncement = (id) => {
  if (!db) throw new Error('Database not initialized');
  db.run('DELETE FROM announcements WHERE id = ?', [id]);
  saveDb();
  return true;
};

// ============ POLLS ============

const addPoll = (question) => {
  if (!db) throw new Error('Database not initialized');
  const id = generateId();
  const now = new Date().toISOString();
  db.run('INSERT INTO polls (id, question, active, created_at) VALUES (?, ?, 1, ?)', [id, question, now]);
  saveDb();
  return { id };
};

const getPolls = () => {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT * FROM polls ORDER BY created_at DESC');
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    const responsesResult = db.exec('SELECT COUNT(*) FROM poll_responses WHERE poll_id = ?', [obj.id]);
    const responseCount = responsesResult[0]?.values[0]?.[0] || 0;
    return { id: obj.id, question: obj.question, active: obj.active === 1, responseCount, createdAt: obj.created_at };
  });
};

const getActivePoll = () => {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC LIMIT 1');
  if (result.length === 0 || result[0].values.length === 0) return null;
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return { id: obj.id, question: obj.question };
};

const addPollResponse = (pollId, response) => {
  if (!db) throw new Error('Database not initialized');
  const id = generateId();
  const now = new Date().toISOString();
  db.run('INSERT INTO poll_responses (id, poll_id, response, created_at) VALUES (?, ?, ?, ?)', [id, pollId, response, now]);
  saveDb();
  return { id };
};

const getPollResponses = (pollId) => {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT * FROM poll_responses WHERE poll_id = ? ORDER BY created_at DESC', [pollId]);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return { id: obj.id, response: obj.response, createdAt: obj.created_at };
  });
};

const togglePoll = (id, active) => {
  if (!db) throw new Error('Database not initialized');
  db.run('UPDATE polls SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
  saveDb();
  return true;
};

const deletePoll = (id) => {
  if (!db) throw new Error('Database not initialized');
  db.run('DELETE FROM poll_responses WHERE poll_id = ?', [id]);
  db.run('DELETE FROM polls WHERE id = ?', [id]);
  saveDb();
  return true;
};

// ============ DISABLED PLATFORMS ============

const disablePlatform = (platform, reason = '') => {
  if (!db) throw new Error('Database not initialized');
  const now = new Date().toISOString();
  db.run('INSERT OR REPLACE INTO disabled_platforms (platform, reason, disabled_at) VALUES (?, ?, ?)', [platform, reason, now]);
  saveDb();
  return true;
};

const enablePlatform = (platform) => {
  if (!db) throw new Error('Database not initialized');
  db.run('DELETE FROM disabled_platforms WHERE platform = ?', [platform]);
  saveDb();
  return true;
};

const getDisabledPlatforms = () => {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT * FROM disabled_platforms');
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return { platform: obj.platform, reason: obj.reason, disabledAt: obj.disabled_at };
  });
};

const isPlatformDisabled = (platform) => {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec('SELECT * FROM disabled_platforms WHERE platform = ?', [platform]);
  return result.length > 0 && result[0].values.length > 0;
};

module.exports = {
  initDb,
  addReport,
  getReports,
  updateReportStatus,
  deleteReport,
  addRating,
  getRatings,
  getAverageRating,
  incrementDownload,
  getStats,
  // Announcements
  addAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
  deleteAnnouncement,
  // Polls
  addPoll,
  getPolls,
  getActivePoll,
  addPollResponse,
  getPollResponses,
  togglePoll,
  deletePoll,
  // Disabled platforms
  disablePlatform,
  enablePlatform,
  getDisabledPlatforms,
  isPlatformDisabled,
};
