# Token Management System with MongoDB Atlas

A beginner-friendly, transparent full-stack web application designed for live evaluation in college Web Programming courses. Organizers (clinics, event managers) create queue events with a scannable QR code, and attendees get digital tokens in arrival order without creating an account. All data is stored **only in MongoDB Atlas** — no localStorage data, no in-memory fallbacks.

---

## Folder Structure

```text
webprog/
├── api/
│   └── index.js             # Vercel serverless entry: connects Atlas, then hands /api/* to Express
├── server/
│   ├── models/
│   │   ├── User.js          # Organizer account schema (name, email, password)
│   │   ├── Event.js         # Event schema (title, owner, lastTokenNumber)
│   │   └── Token.js         # Queue token schema (event, tokenNumber, name, status, timestamps)
│   ├── routes/
│   │   ├── auth.js          # /api/auth/register and /api/auth/login
│   │   ├── public.js        # /api/public/events/:id and /join (no auth required)
│   │   ├── events.js        # CRUD /api/events for organizer (auth required)
│   │   └── tokens.js        # /api/tokens list and status update (auth required)
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware (attaches req.userId)
│   ├── .env.example         # Example config (PORT, MONGO_URI, JWT_SECRET) - copy to server/.env
│   ├── .env                 # Your local secrets (gitignored - never committed)
│   ├── package.json         # Backend dependencies (express, mongoose, bcryptjs, jsonwebtoken, cors, dotenv)
│   └── server.js            # Main Express entry point, Atlas connection + demo seeding, route mounting
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Organizer login (/login)
│   │   │   ├── Register.jsx    # Organizer signup (/register)
│   │   │   ├── Dashboard.jsx   # Event list & creation (/dashboard)
│   │   │   ├── ManageEvent.jsx # QR code, token table, mark-done (/events/:id)
│   │   │   └── JoinEvent.jsx   # Public attendee token registration (/join/:id)
│   │   ├── services/
│   │   │   └── storage.js      # API client - fetch() calls to /api/* (JWT kept in localStorage)
│   │   ├── App.jsx          # Route definitions
│   │   ├── main.jsx         # React DOM mount
│   │   └── index.css        # Single plain stylesheet for responsive layout
│   ├── vite.config.js       # Vite proxy /api -> localhost:4000 and host: 0.0.0.0
│   ├── package.json         # Frontend dependencies (react, react-router-dom, qrcode.react)
│   └── index.html           # HTML container
├── vercel.json              # Vercel build + rewrites (/api/* -> serverless function)
├── api-tests.http           # REST Client test file for all API endpoints
├── EXPLAINME.md             # Complete viva preparation & live code walkthrough guide
└── README.md                # Project documentation & setup instructions
```

---

## Getting Started & Setup

### Prerequisites
- **Node.js**: v18+ installed (`node -v`)
- **MongoDB Atlas connection string** (free tier works): from [MongoDB Atlas](https://cloud.mongodb.com) -> Database -> Connect -> Drivers, e.g.
  `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/token_system?retryWrites=true&w=majority`

### 1. Setup Backend
Open a terminal in the project root:
```bash
cd server
npm install
```
Create `server/.env` (copy from `server/.env.example`) and fill in your values:
```env
PORT=4000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/token_system?retryWrites=true&w=majority
JWT_SECRET=a_long_random_secret_string
```
Then start the backend:
```bash
npm run dev        # live reload via nodemon (or: npm start)
```
You should see `Connected to MongoDB Atlas`. The server runs on `http://localhost:4000`.

> On the very first connection, if the database is empty, demo data is seeded automatically
> (account `organizer@test.com` / `password123`, one demo event with 3 tokens). This is done for the
> viva demo - it is seeding, not a fallback.

### 2. Setup Frontend
Open a second terminal in the project root:
```bash
cd client
npm install
npm run dev
```
The client runs on `http://localhost:5173` and proxies `/api/*` to the backend on `:4000`.

---

## REST API Endpoints

| Method | Endpoint | Login Needed? | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | Health check: `{ "status": "ok", "db": "connected" \| "disconnected" }` |
| `POST` | `/api/auth/register` | No | Register a new organizer account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticate organizer; returns `{ jwt }` |
| `GET` | `/api/public/events/:id` | No | Fetch public event details (`{ title }`) for attendee join page |
| `POST` | `/api/public/events/:id/join` | No | Atomically increment `lastTokenNumber`, generate new Token |
| `POST` | `/api/events` | **Yes** | Create a new event with `title` (owned by organizer) |
| `GET` | `/api/events` | **Yes** | Fetch all events owned by logged-in organizer |
| `GET` | `/api/events/:id` | **Yes** | Fetch single event if owned by logged-in organizer |
| `PUT` | `/api/events/:id` | **Yes** | Update event `title` |
| `DELETE` | `/api/events/:id` | **Yes** | Delete event and cascade delete all its tokens |
| `GET` | `/api/tokens?eventId=...` | **Yes** | Fetch all tokens for an event sorted in order of arrival (`tokenNumber`) |
| `PUT` | `/api/tokens/:id` | **Yes** | Update token status (`"waiting"` or `"done"`) |

---

## Phone QR Demo Tip (Live Presentation)

When demonstrating the app live on a mobile phone:
1. Ensure your laptop and phone are connected to the **same Wi-Fi network**.
2. Find your laptop's local IP address (e.g., `192.168.1.5`):
   - On Windows: Run `ipconfig` in Command Prompt and check `IPv4 Address`.
3. Open the organizer dashboard on your laptop using that IP:
   `http://192.168.1.5:5173` (instead of `http://localhost:5173`).
4. Because the app uses `window.location.origin`, the generated QR code and join URL will automatically embed `http://192.168.1.5:5173/join/<eventId>`.
5. Any mobile phone scanning the QR code will open the public join page immediately and receive a token without network configuration errors.

---

## Deploy to Vercel (Your Own Account)

Deploy **your own fork** of this repository - not a teammate's deployment.

1. **Fork & Import**: Fork this repo on GitHub, then go to [Vercel Dashboard](https://vercel.com/new) and **Import** your fork.
2. **Framework Preset**: Select **Vite**. Leave the other defaults - `vercel.json` already defines:
   - build: `cd client && npm install && npm run build && cd ../server && npm install`
   - output: `client/dist`
   - rewrites: `/api/(.*)` -> `/api/index.js` (serverless function), everything else -> `index.html`
3. **Add Environment Variables** (Project -> Settings -> Environment Variables):
   - `MONGO_URI` = your full Atlas connection string (**no `<` `>` placeholders - paste the real password**)
   - `JWT_SECRET` = a long random string
4. **Allow Vercel to reach Atlas**: In MongoDB Atlas -> **Network Access** -> Add IP Address -> **Allow Access from Anywhere** (`0.0.0.0/0`). (Vercel serverless functions use dynamic IPs.)
5. Click **Deploy**.
6. Test it: open `https://<your-app>.vercel.app/api/health` - it must return:
   ```json
   { "status": "ok", "db": "connected" }
   ```

> **Default Demo Account** (seeded automatically on the first successful Atlas connection):
> - Email: `organizer@test.com`
> - Password: `password123`
> *(You can also register any new account on the register page!)*

---

## Troubleshooting

| Problem | Cause | Fix |
| :--- | :--- | :--- |
| `FUNCTION_INVOCATION_FAILED` / 500 on `/api/*` | Bad or missing `MONGO_URI` in Vercel Env Vars (wrong password, or the `<password>` placeholder was never replaced) | Project Settings -> Environment Variables -> fix `MONGO_URI` -> Redeploy. There is **no fallback DB** - the API intentionally returns 500 so misconfiguration is visible. |
| `Could not connect to any servers` / IP whitelist error | Atlas Network Access does not allow Vercel's IPs | Atlas -> Network Access -> add `0.0.0.0/0`. |
| Vercel forces a login page before the site loads | Vercel Deployment Protection is enabled | Project Settings -> Deployment Protection -> disable **Vercel Authentication**. |
| `Cannot find module 'dotenv'` | `dotenv` was required unconditionally from the serverless function | Already fixed - `api/index.js` loads `dotenv` inside a `try/catch`, so it works with or without a local `server/.env`. |
| `MONGO_URI not set` thrown locally | Missing `server/.env` | Copy `server/.env.example` to `server/.env` and fill in your Atlas URI. |
