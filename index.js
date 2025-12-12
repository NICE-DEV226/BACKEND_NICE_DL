require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
// Use Vercel KV for serverless, SQLite for local dev
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
const { initDb } = isServerless 
  ? (hasKV ? require("./models/kvStorage") : require("./models/storage"))
  : require("./models/database");

const app = express();

app.use(cors());
app.use(express.json());
app.set("json spaces", 2);
app.use(morgan("dev"));

app.use("/api/bluesky", require("./routes/bluesky"));
app.use("/api/capcut", require("./routes/capcut"));
app.use("/api/dailymotion", require("./routes/dailymotion"));
app.use("/api/douyin", require("./routes/douyin"));
app.use("/api/kuaishou", require("./routes/kuaishou"));
app.use("/api/linkedin", require("./routes/linkedin"));
app.use("/api/meta", require("./routes/facebookInsta"));
app.use("/api/pinterest", require("./routes/pinterest"));
app.use("/api/reddit", require("./routes/reddit"));
app.use("/api/spotify", require("./routes/spotify"));
app.use("/api/snapchat", require("./routes/snapchat"));
app.use("/api/soundcloud", require("./routes/soundcloud"));
app.use("/api/threads", require("./routes/threads"));
app.use("/api/tiktok", require("./routes/tiktok"));
app.use("/api/tumblr", require("./routes/tumblr"));
app.use("/api/twitter", require("./routes/twitter"));
app.use("/api/youtube", require("./routes/youtube"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/proxy", require("./routes/proxy"));

const endpoints = [
  "/api/bluesky",
  "/api/capcut",
  "/api/dailymotion",
  "/api/douyin",
  "/api/kuaishou",
  "/api/linkedin",
  "/api/meta",
  "/api/pinterest",
  "/api/reddit",
  "/api/snapchat",
  "/api/spotify",
  "/api/soundcloud",
  "/api/threads",
  "/api/tiktok",
  "/api/tumblr",
  "/api/twitter",
  "/api/youtube",
];

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    author: "NICE-DEV",
    message: "Universal Downloader API is running",
    endpoints,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
  });
});

const PORT = process.env.PORT || 3000;

// Initialize database then start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database initialized`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
