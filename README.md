# Bizz1 Business Hub — MERN Stack

Full-stack business dashboard for BizzOne Digital. Built with MongoDB, Express, React, and Node.js.

---

## Project Structure

```
bizz1-hub/
├── backend/          ← Node.js + Express + MongoDB API
└── frontend/         ← React (CRA) client
```

---

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm

---

### Step 1 — Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:
- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET` — a strong random string (min 32 chars)
- `JWT_REFRESH_SECRET` — another strong random string
- `ANTHROPIC_API_KEY` — (optional) for AI Advisor. Get from console.anthropic.com

```bash
npm install
npm run seed      # Seeds admin user + all 25 employees + default data
npm run dev       # Starts API on http://localhost:5000
```

---

### Step 2 — Frontend Setup

```bash
cd frontend
npm install
npm start         # Starts React on http://localhost:3000
```

---

## Default Login

| Field    | Value              |
|----------|--------------------|
| Email    | admin@bizzone.com  |
| Password | BizzOne@2026       |
| Role     | Admin (full access)|

> ⚠️ Change the password immediately after first login via Settings → Security.

---

## Features

### Modules
| Module           | Description                                              |
|-----------------|----------------------------------------------------------|
| Home            | Dashboard overview, KPIs, Website P&L, Payroll by dept  |
| Unit Economics  | Website pricing, break-even, commission tracker          |
| Rate Card       | Service pricing, markup, package builder                 |
| Payroll         | Roster, capacity planning, compliance tracking           |
| P&L Model       | Monthly P&L with retainer clients and expenses           |
| AI Advisor      | Claude-powered business intelligence chat                |
| Settings        | Exchange rates, users, password management               |

### Security
- JWT access tokens (15 min) + refresh token rotation (7 days)
- Account lockout after 5 failed login attempts (30 min cooldown)
- bcrypt password hashing (salt rounds: 12)
- Role-based access: **viewer** / **manager** / **admin**
- Rate limiting: 200 req/15min global, 10 req/15min on auth
- Helmet security headers
- CORS restricted to frontend URL

### Role Permissions
| Feature              | Viewer | Manager | Admin |
|---------------------|--------|---------|-------|
| View all data        | ✅     | ✅      | ✅    |
| Edit payroll data    | ❌     | ✅      | ✅    |
| Manage rate card     | ❌     | ✅      | ✅    |
| Change settings      | ❌     | ❌      | ✅    |
| Manage users         | ❌     | ❌      | ✅    |
| Add employees        | ❌     | ✅      | ✅    |
| Delete employees     | ❌     | ❌      | ✅    |

---

## API Endpoints

### Auth (`/api/auth`)
```
POST   /login              — Login
POST   /refresh            — Refresh access token
POST   /logout             — Logout (clears refresh token)
GET    /me                 — Current user info
PATCH  /change-password    — Change own password
POST   /users              — Create user [admin]
GET    /users              — List all users [admin]
PATCH  /users/:id          — Update user [admin]
```

### Payroll (`/api/payroll`)
```
GET    /employees          — List employees
POST   /employees          — Add employee
PATCH  /employees/:id      — Update employee
DELETE /employees/:id      — Soft delete
GET    /monthly/:month?    — Monthly payroll summary (YYYY-MM)
PATCH  /monthly/:month/status/:id  — Update payment status
POST   /monthly/:month/mark-all-paid
GET    /departments        — Department summary
```

### Other
```
GET/PUT  /api/unit-economics/:month?
GET/PUT  /api/rate-card
GET/PUT  /api/pl-model/:month?
GET/PUT  /api/settings
GET      /api/commissions/:month?
POST     /api/ai/chat
GET      /api/health
```

---

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bizz1_hub
JWT_SECRET=<strong-random-string>
JWT_REFRESH_SECRET=<strong-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
USD_TO_CAD=1.38
PKR_PER_USD=283
WORKING_HOURS_PER_MONTH=160
ANTHROPIC_API_KEY=sk-ant-...   # Optional, for AI Advisor
```

---

## Tech Stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- bcryptjs, jsonwebtoken
- Helmet, CORS, express-rate-limit

**Frontend**
- React (Create React App)
- React Router v6
- Axios (with auto token refresh)
- Chart.js + react-chartjs-2
- react-hot-toast

---

## Notes

- All financial data stored in PKR. CAD conversion is applied at runtime using exchange rates from Settings.
- P&L months are automatically locked once marked as historical.
- The AI Advisor requires an Anthropic API key — the rest of the app works without it.
- Exchange rates can be updated live from Settings without restarting the server.
