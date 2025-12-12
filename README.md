<div align="center">

# NICE Downloader API

Universal media downloader API supporting 17+ platforms.

<img src="https://i.ibb.co/Xkdr0bWH/screenshot.png" alt="NICE Downloader" style="max-width: 400px; width: 100%;">



## Supported Platforms

| Platform | Status | Endpoint |
|----------|--------|----------|
| TikTok | ✅ | `/api/tiktok/download` |
| YouTube | ✅ | `/api/youtube/download` |
| Instagram | ✅ | `/api/meta/download` |
| Facebook | ✅ | `/api/meta/download` |
| Pinterest | ✅ | `/api/pinterest/download` |
| LinkedIn | ✅ | `/api/linkedin/download` |
| Reddit | ✅ | `/api/reddit/download` |
| Threads | ✅ | `/api/threads/download` |
| Snapchat | ✅ | `/api/snapchat/download` |
| SoundCloud | ✅ | `/api/soundcloud/download` |
| Dailymotion | ✅ | `/api/dailymotion/download` |
| Tumblr | ✅ | `/api/tumblr/download` |
| Bluesky | ✅ | `/api/bluesky/download` |
| Douyin | ✅ | `/api/douyin/download` |
| Kuaishou | ✅ | `/api/kuaishou/download` |
| CapCut | ✅ | `/api/capcut/download` |
| Spotify | ⚠️ | `/api/spotify/download` |
| Twitter/X | ⚠️ | `/api/twitter/download` |

> ⚠️ = Temporarily unavailable (external service issues)

## Quick Start

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

## API Usage

### Download Media

```
GET /api/{platform}/download?url={media_url}
```

**Example:**
```bash
curl "http://localhost:3000/api/tiktok/download?url=https://www.tiktok.com/@user/video/123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "thumbnail": "https://...",
    "downloads": [
      { "url": "https://...", "quality": "HD" }
    ]
  }
}
```



### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Get platform statistics |
| GET | `/api/admin/reports` | Get user reports |
| PATCH | `/api/admin/reports/:id` | Update report status |
| DELETE | `/api/admin/reports/:id` | Delete report |
| GET | `/api/admin/ratings` | Get user ratings |
| GET | `/api/admin/announcements` | Get announcements |
| POST | `/api/admin/announcements` | Create announcement |
| PATCH | `/api/admin/announcements/:id` | Toggle announcement |
| DELETE | `/api/admin/announcements/:id` | Delete announcement |
| GET | `/api/admin/polls` | Get polls |
| POST | `/api/admin/polls` | Create poll |
| GET | `/api/admin/polls/:id/responses` | Get poll responses |
| DELETE | `/api/admin/polls/:id` | Delete poll |
| GET | `/api/admin/platforms` | Get disabled platforms |
| POST | `/api/admin/platforms/disable` | Disable platform |
| POST | `/api/admin/platforms/enable` | Enable platform |

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/report` | Submit error report |
| POST | `/api/admin/rating` | Submit rating |
| POST | `/api/admin/track` | Track download |
| GET | `/api/admin/public/announcements` | Get active announcements |
| GET | `/api/admin/public/poll` | Get active poll |
| POST | `/api/admin/public/poll/:id/respond` | Submit poll response |
| GET | `/api/admin/public/disabled-platforms` | Get disabled platforms |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_KEY` | Admin authentication key | `nicedl-admin-2024` |
| `PORT` | Server port | `3000` |

## Deployment

### Vercel

1. Import this repository
2. Set `ADMIN_KEY` in environment variables
3. Deploy

> Note: On Vercel, data is stored in-memory and resets on cold starts.
> For persistence, integrate with Vercel KV, PlanetScale, or MongoDB Atlas.

### VPS / Server

```bash
# With PM2
pm2 start index.js --name "nicedl-api"

# Or directly
node index.js
```

## Project Structure

```
├── controllers/     # Request handlers
├── services/        # Platform-specific logic
├── routes/          # API routes
├── models/          # Data storage
│   ├── database.js  # SQLite (local dev)
│   └── storage.js   # In-memory (serverless)
├── index.js         # Entry point
└── vercel.json      # Vercel config
```

## License

MIT © NICE-DEV
