# 🛰️ GeoGuardian - AI-Powered Environmental Monitoring

**Real-time satellite monitoring for climate action, disaster response, and environmental protection.**

---

## 🌍 Overview


## ✨ Features

### 🛰️ High-Resolution Satellite Imagery
- 10-meter resolution Sentinel-2 data
- Automatic cloud masking (max 30% clouds)
- Updated every 5 days globally
- Free access (would cost $50+ per image commercially)

### 🔍 AI Change Detection
- Pixel-by-pixel RGB analysis
- Severity classification (low/medium/high)
- Automatic change type identification
- Email alerts for critical changes

### 🎬 Time-Lapse Generation
- Create animations from multiple dates
- Visualize 6 months of change in 6 seconds
- Interactive slideshow controls
- Perfect for presentations

### 🕐 Automated Monitoring
- Schedule daily/weekly/monthly checks
- Monitor unlimited regions simultaneously
- Instant email notifications
- Zero manual effort required

### 🗺️ Interactive Tools
- Map-based region selection
- Coordinates to BBox converter
- Historical analysis tracking
- User authentication & data persistence

---

## 🎯 Use Cases

| Sector | Application | Impact |
|--------|-------------|--------|
| **NGOs** | Monitor protected forests 24/7 | Stop illegal deforestation |
| **Disaster Response** | Early wildfire/flood detection | Save lives and property |
| **Researchers** | Long-term climate documentation | Publish peer-reviewed studies |
| **Government** | Urban planning & agriculture | Data-driven policy decisions |
| **Insurance** | Damage assessment & verification | Faster claims processing |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MySQL 8.0+ server
- Sentinel Hub API credentials (free tier)
- Gmail account (for alerts)

### Installation

**1. Clone Repository**
```bash
git clone https://github.com/yourusername/geoguardian.git
cd geoguardian
```

**2. Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
node index.js
```

**3. Frontend Setup**
```bash
cd frontend
npm install
npm start
```

**4. Access App**
```
Frontend: http://localhost:3000
Backend: http://localhost:5000
```

### MySQL initialization

Create `backend/.env` from `backend/.env.example`, set `DB_PASSWORD` to the
password for your local MySQL account, then run:

```bash
mysql -u root -p < backend/database/schema.sql
```

The schema creates the `geoguardian` database and its tables. Start the backend
with `npm start` from `backend`, then start the frontend with `npm start` from
`frontend`.

---

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI framework
- **Leaflet.js** - Interactive maps
- **Chart.js** - Data visualization
- **Axios** - API requests

### Backend
- **Node.js & Express** - Server framework
- **MySQL** - Relational database and image BLOB storage
- **Sharp** - Image processing
- **Node-cron** - Task scheduling
- **Nodemailer** - Email alerts

### APIs & Services
- **Sentinel Hub API** - Satellite imagery
- **JWT** - Authentication
- **Bcrypt** - Password hashing

---

## 📊 Architecture

```
┌─────────────┐
│   React     │  ← User Interface
│  Frontend   │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────┐
│   Express   │  ← API Server
│   Backend   │
└──────┬──────┘
       │
   ┌───┴────┬────────────┬──────────┐
   │        │            │          │
┌──▼───┐ ┌─▼───────┐ ┌──▼─────┐ ┌─▼──────┐
│ MySQL │ │Sentinel │ │  Cron  │ │ Email  │
│ BLOBs │ │  Hub    │ │Scheduler│ │Service │
└───────┘ └─────────┘ └────────┘ └────────┘
```

---

## 📸 Screenshots

### Dashboard
![Dashboard]
<img width="1901" height="906" alt="Screenshot 2025-10-30 124913" src="https://github.com/user-attachments/assets/64823eb3-ec92-47c3-8840-178a6aaa9d8c" />

*Fetch satellite imagery with coordinates converter*

### Change Detection
![Comparison]
<img width="1902" height="897" alt="Screenshot 2025-10-30 130721" src="https://github.com/user-attachments/assets/55ef322b-2a7b-4919-aafe-42fac5b48d27" />

<img width="1896" height="902" alt="Screenshot 2025-10-30 130907" src="https://github.com/user-attachments/assets/d5db96d6-8e75-4826-b256-e99ac5294e7d" />

*Before/after analysis with AI-powered change detection*

### Time-Lapse
![Time-lapse]
<img width="1897" height="905" alt="Screenshot 2025-10-30 131213" src="https://github.com/user-attachments/assets/9e09f83f-54d1-4d49-9c5c-5127486956be" />

*Animated visualization of environmental changes*

### Automated Monitoring
![Monitoring]
<img width="1893" height="909" alt="Screenshot 2025-10-30 131348" src="https://github.com/user-attachments/assets/62c892a4-855d-4caa-a25b-1eb35ec15ee0" />

*Set up regions for automated 24/7 monitoring*

---

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=geoguardian
DB_USER=root
DB_PASSWORD=Ganesh1242
GEMINI_API_KEY=your-gemini-api-key
SENTINEL_CLIENT_ID=
SENTINEL_CLIENT_SECRET=your_client_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
JWT_SECRET=your_secret_key
PORT=5000
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://localhost:5000
```

---

## 📖 API Documentation

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
```

### Satellite Imagery
```http
POST /api/nasa/image
GET /api/nasa/image/:id
```

### Change Detection
```http
POST /api/change-detection
GET /api/change-detection/diff/:id
```

### Time-Lapse
```http
POST /api/timelapse/generate
GET /api/timelapse/:parentId/frames
```

### Monitoring
```http
POST /api/monitoring/regions
GET /api/monitoring/regions
POST /api/monitoring/regions/:id/check
```

---

## 🧪 Testing

### Manual Testing Locations

**California Wildfire (July 2024):**
```
Before: 2024-07-20
After: 2024-07-30
BBox: -121.8,39.8,-121.3,40.3
Expected: 20-30% change, HIGH severity
```

**Agricultural Seasonal:**
```
Before: 2024-02-01
After: 2024-05-01
BBox: -121.5,36.5,-121.0,37.0
Expected: 5-15% change, LOW-MEDIUM severity
```

---

## 🚀 Deployment

Deployed on:
- **Frontend:** Vercel 
- **Backend:** Render 
- **Database:** MySQL

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request




## 🙏 Acknowledgments

- **Sentinel Hub** for providing free satellite data access
- **ESA Copernicus** for Sentinel-2 satellite program
- **Open Source Community** for amazing libraries and tools

---


## 🌟 Star This Repository

If you find GeoGuardian useful, please ⭐ this repository to show your support!

---

**Made with ❤️ for our planet** 🌍
