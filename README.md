# Token Management System

A beginner-friendly, transparent full-stack web application designed for live evaluation in college Web Programming courses. Allows organizers (clinics, event managers) to create queue events with a scannable QR code, and allows attendees to get digital tokens in arrival order without creating an account.

---

## Folder Structure

```text
webprog/
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
│   ├── .env                 # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   ├── .env.example         # Example configuration file
│   ├── package.json         # Backend dependencies (express, mongoose, bcryptjs, etc.)
│   └── server.js            # Main Express entry point, DB connection, route mounting
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Organizer login (/login)
│   │   │   ├── Register.jsx    # Organizer signup (/register)
│   │   │   ├── Dashboard.jsx   # Event list & creation (/dashboard)
│   │   │   ├── ManageEvent.jsx # QR code, token table, mark-done (/events/:id)
│   │   │   └── JoinEvent.jsx   # Public attendee token registration (/join/:id)
│   │   ├── App.jsx          # Route definitions
│   │   ├── main.jsx         # React DOM mount
│   │   └── index.css        # Single plain stylesheet for responsive layout
│   ├── vite.config.js       # Vite proxy to backend (:4000) and host: true
│   ├── package.json         # Frontend dependencies (react, react-router-dom, qrcode.react)
│   └── index.html           # HTML container
├── api-tests.http           # REST Client test file for all API endpoints
├── EXPLAINME.md             # Complete viva preparation & live code walkthrough guide
└── README.md                # Project documentation & setup instructions
```

---

## Getting Started & Setup

### Prerequisites
- **Node.js**: v18+ installed (`node -v`)
- **MongoDB**: Running locally on port `27017` (e.g. via MongoDB Community Server or MongoDB Compass)

### 1. Setup Backend
Open a terminal in the project root:
```bash
cd server
npm install
npm start
```
*Note: For live reload during development, you can use `npm run dev` (powered by nodemon).*
The server will run on `http://localhost:4000` and connect to `mongodb://127.0.0.1:27017/token_system`.

### 2. Setup Frontend
Open a second terminal in the project root:
```bash
cd client
npm install
npm run dev
```
The client will run on `http://localhost:5173`.

---

## REST API Endpoints

| Method | Endpoint | Login Needed? | Purpose |
| :--- | :--- | :--- | :--- |
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

## Deploy to GitHub & Vercel

### 1. Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new) (do not initialize with README or license).
2. Run the following commands in the project root:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git branch -M main
   git push -u origin main
   ```

### 2. Deploy on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new) and select **Import** next to your new GitHub repository.
2. No environment variables or external database setup needed!
3. Click **Deploy**.
4. Vercel will automatically build the application and provide a live URL in seconds.

> **Default Demo Account**:
> - Email: `organizer@test.com`
> - Password: `password123`
> *(You can also register any new account on the register page!)*
