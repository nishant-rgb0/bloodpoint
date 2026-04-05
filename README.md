# 🩸 BloodPoint — AI-Powered Blood Donor Platform

A full-stack, production-ready blood donor management application with ML features, real-time matching, and a complete dashboard.

## ✨ Features

- **🤖 AI Donation Predictor** — RFMTC model predicts donor return likelihood
- **🩸 Blood Request System** — Submit/respond to blood requests with urgency levels
- **👥 Donor Management** — Register, search, filter donors by blood type & city
- **🏥 Blood Bank Inventory** — Real-time stock across 5+ blood banks
- **📊 Analytics Dashboard** — Charts for donations, blood types, city distribution
- **🔔 Smart Notifications** — In-app alerts when matching donors are found
- **💉 Donation Logging** — Track personal donation history
- **🔐 Auth System** — Secure registration & login with sessions

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# OR for development (auto-restart)
npm run dev
```

The app will open at **http://localhost:3000**

### Demo Account
- **Email:** demo@bloodpoint.in  
- **Password:** demo123

## 🗂️ Project Structure

```
bloodpoint/
├── server.js              # Express server entry point
├── package.json
├── db/
│   └── database.js        # SQLite schema + seeding
├── routes/
│   ├── auth.js            # Register, login, logout, /me
│   ├── donors.js          # Donor CRUD + ML predictor
│   ├── requests.js        # Blood request management
│   ├── banks.js           # Blood banks + inventory + analytics
│   └── notifications.js   # Notification system
└── public/
    └── index.html         # Full SPA frontend
```

## 🔌 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Create donor account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current session |
| GET | /api/donors | List donors (filterable) |
| POST | /api/donors/predict | Run ML prediction |
| POST | /api/donors/:id/donate | Log a donation |
| GET | /api/requests | List blood requests |
| POST | /api/requests | Create blood request |
| POST | /api/requests/:id/respond | Donor volunteers |
| GET | /api/banks | Blood banks + inventory |
| GET | /api/banks/analytics/stats | Platform analytics |
| GET | /api/notifications | User notifications |

## 🧠 ML Algorithm (RFMTC Model)

The predictor uses the RFMTC model — the gold standard in blood donation research:
- **R** — Recency: months since last donation
- **F** — Frequency: total donations made
- **M** — Monetary: total blood volume donated
- **T** — Time: months between first and last donation
- **C** — Class: probability of donating in next 90 days

Donor segments: **Champion** (75%+) · **Loyal** (55-74%) · **At Risk** (35-54%) · **Lapsed** (<35%)

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (via better-sqlite3)  
- **Auth:** express-session + bcryptjs
- **Frontend:** Vanilla JS SPA, Chart.js
- **ML:** Custom RFMTC implementation in Node.js
