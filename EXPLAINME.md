# Viva Preparation & Code Explanation Guide

This guide breaks down every aspect of the Token Management System for oral evaluations and live coding defense. The app stores **all data in MongoDB Atlas only** - no localStorage data store, no in-memory fallback.

---

## 1. Application Flow & Exact Function Trace

### Step 1: Organizer Login
1. **Frontend**: User enters email & password on `client/src/pages/Login.jsx`.
2. **Action**: `handleSubmit` calls `storage.login()`, which sends a `POST` fetch to `/api/auth/login` via `client/src/services/storage.js`.
3. **Backend**: `server/routes/auth.js` locates the user with `User.findOne({ email })`, compares the password hash using `bcrypt.compare`, signs a token via `jwt.sign({ userId: user._id })`, and returns `{ jwt: token }`.
4. **State**: Frontend receives `data.jwt`, saves it into `localStorage.setItem("jwt", data.jwt)` (**only the JWT session lives in localStorage - all app data lives in Atlas**), and navigates to `/dashboard`.

### Step 2: Create an Event
1. **Frontend**: `client/src/pages/Dashboard.jsx` loads existing events on mount via `loadEvents()` -> `storage.getEvents()` -> `GET /api/events` with header `Authorization: Bearer <jwt>`.
2. **Backend**: `server/middleware/auth.js` decodes the JWT and sets `req.userId`. Then `server/routes/events.js` runs `Event.find({ owner: req.userId })`.
3. **Action**: Organizer types a title and clicks "Create Event". `handleCreate` -> `storage.createEvent(title)` -> `POST /api/events` with `{ title }`.
4. **Backend**: Creates a new event with `title`, `owner: req.userId`, and `lastTokenNumber: 0` (schema default) and saves it to Atlas.

### Step 3: QR Code Generation & Display
1. **Frontend**: Organizer clicks "Manage" next to an event. Router opens `client/src/pages/ManageEvent.jsx`.
2. **Function**: `loadData()` fetches the event details (`GET /api/events/:id`) and existing tokens (`GET /api/tokens?eventId=:id`).
3. **Rendering**: The page uses `QRCodeSVG` from `qrcode.react` to render a QR code containing `window.location.origin + "/join/" + id`.

### Step 4: Attendee Scans QR Code & Receives Token
1. **Frontend**: Attendee opens the link on a phone browser which loads `client/src/pages/JoinEvent.jsx` (no login or account needed).
2. **Function**: On mount, `loadEvent()` calls `storage.getPublicEvent(id)` -> `GET /api/public/events/:id` to retrieve the event title.
3. **Action**: Attendee enters their name and clicks "Get My Token". `handleJoin` -> `storage.joinEvent(id, name)` -> `POST /api/public/events/:id/join` with `{ name }`.
4. **Backend**: `server/routes/public.js` atomically increments `lastTokenNumber` using `Event.findByIdAndUpdate(req.params.id, { $inc: { lastTokenNumber: 1 } }, { new: true })`. It creates a new `Token` document with that number and saves it.
5. **State**: The server returns the new token document (status 201). Frontend sets `setMyToken(data)`, displaying the big token number `#1` directly on the screen.

### Step 5: Organizer Marks Attendee Done
1. **Frontend**: Organizer clicks "Refresh" in `client/src/pages/ManageEvent.jsx`. `loadData()` retrieves the updated token list sorted ascending by `tokenNumber`.
2. **Action**: Organizer clicks "Mark Done" next to the waiting token. `handleMarkDone(tokenId)` -> `storage.markTokenDone(tokenId)` -> `PUT /api/tokens/:id` with `{ status: "done" }`.
3. **Backend**: `server/routes/tokens.js` updates `status` to `"done"` via `Token.findByIdAndUpdate`.
4. **Result**: `loadData()` is called again, and the status changes from "waiting" to "Done".

### How the Deployment Request Flow Works (Vercel)
1. Browser loads the React SPA from Vercel's CDN (static files from `client/dist`).
2. Any request to `/api/*` is rewritten (see `vercel.json`) to the serverless function `api/index.js`.
3. `api/index.js` optionally loads `dotenv` (local dev), ensures `JWT_SECRET`, then calls `await connectDB()` from `server/server.js` - on a warm function the existing Mongoose connection is reused (`readyState === 1` check), on a cold start it connects to Atlas.
4. If `connectDB()` throws, the function responds `500 { message: "Database connection failed", error: ... }`. Otherwise the request is passed to the Express `app(req, res)`.

### Atlas Demo Seeding (NOT a fallback)
- In `server/server.js`, after a successful Atlas connection, `User.countDocuments()` is checked.
- If the database is completely empty (first ever connection), it seeds:
  - demo organizer `organizer@test.com` / `password123` (bcrypt hash, salt factor 10),
  - demo event `Campus Tech Expo 2026` with `lastTokenNumber: 3`,
  - 3 demo tokens (Alice `done`, Bob `waiting`, Charlie `waiting`).
- This exists so the viva demo works immediately on a fresh Atlas cluster. It only runs once, and only when the DB is empty.

---

## 2. Which Files to Show During Evaluation

- **React Implementation**:
  - `client/src/App.jsx`: Clean routing with `react-router-dom`.
  - `client/src/pages/Dashboard.jsx`: State hooks (`useState`), lifecycle (`useEffect`), authentication guards.
  - `client/src/pages/ManageEvent.jsx`: Dynamic QR code rendering (`QRCodeSVG`) and tabular data presentation.
  - `client/src/pages/JoinEvent.jsx`: Public unauthenticated attendee view with in-place badge rendering.
  - `client/src/services/storage.js`: API client - every operation is a `fetch()` call to `/api/*` against the Express + Atlas backend. localStorage holds **only** the JWT session.

- **Node & Express Implementation**:
  - `server/server.js`: Server initialization, pure-Atlas `connectDB()` (with demo seeding), middleware layering, and route mounting.
  - `api/index.js`: Vercel serverless entry - DB connection reuse across invocations, optional `dotenv` (try/catch) fix, 500 on connection failure.
  - `server/middleware/auth.js`: Bearer token extraction and JWT verification.
  - `server/routes/public.js`: Atomic `$inc` queue joining logic.

- **Database Design & CRUD**:
  - `server/models/User.js`, `server/models/Event.js`, `server/models/Token.js`: Relational document references (`ref: "User"`, `ref: "Event"`).
  - `server/routes/events.js`: Full CRUD (Create, Read all/one, Update title, Delete with cascade token deletion).

---

## 3. Likely Viva Questions & Answers

1. **Q: Why do you name the JWT token "jwt" everywhere instead of "token"?**
   **A:** In a Token Management System, queue tickets are called "tokens". Naming the authentication JSON Web Token "jwt" prevents any confusion in variable names, database models, and `localStorage` keys.

2. **Q: How do you prevent two users who scan the QR code at the exact same millisecond from getting the same token number?**
   **A:** We use MongoDB's atomic `$inc` operator via `Event.findByIdAndUpdate(id, { $inc: { lastTokenNumber: 1 } }, { new: true })`. MongoDB handles this operation atomically on the database engine level, guaranteeing sequential numbers even under concurrent requests.

3. **Q: Why is the `cors` package needed in Express?**
   **A:** In local development it is not strictly needed, because Vite's dev proxy (`client/vite.config.js`) forwards `/api/*` to `http://localhost:4000`, making requests same-origin. In production, however, the Vite proxy no longer exists - the browser calls the backend through Vercel's serverless route, and `cors()` guarantees cross-origin requests are accepted (e.g. when the frontend and API are reached through different hosts/preview URLs). Keeping `app.use(cors())` makes the API work in both environments.

4. **Q: How are protected routes secured on the backend?**
   **A:** Incoming requests pass through `server/middleware/auth.js`. It checks for an `Authorization: Bearer <jwt>` header, validates the signature with `jwt.verify()` against `process.env.JWT_SECRET`, and extracts `decoded.userId` onto `req.userId`. If missing or invalid, it rejects immediately with status 401.

5. **Q: What happens to tokens when an event is deleted?**
   **A:** In `server/routes/events.js`, when `DELETE /api/events/:id` executes, it runs `Token.deleteMany({ event: req.params.id })` right after deleting the event, ensuring no orphaned token documents remain in the database.

6. **Q: What happens if MongoDB Atlas is unreachable or MONGO_URI is wrong?**
   **A:** There is **no fallback by design**. `connectDB()` in `server/server.js` throws if `MONGO_URI` is missing, and rethrows any connection error. As a result the serverless function in `api/index.js` responds with `500 { "message": "Database connection failed" }`, making the misconfiguration visible immediately instead of silently serving wrong data. Fix = set the correct `MONGO_URI` in Vercel Environment Variables and allow `0.0.0.0/0` in Atlas Network Access, then redeploy.

7. **Q: Why does `api/index.js` load `dotenv` inside a try/catch?**
   **A:** Locally, `dotenv` reads `server/.env` to provide `MONGO_URI`/`JWT_SECRET`. On Vercel, environment variables come from the project dashboard and `server/.env` does not exist, so an unconditional `require("dotenv").config(...)` on a missing file (or a missing dependency) would crash the function with `Cannot find module 'dotenv'`. Wrapping it in `try { ... } catch { }` makes it optional: real env vars from Vercel are used in production, `.env` is used locally.

8. **Q: Where is data stored - localStorage, memory, or Atlas?**
   **A:** Only **MongoDB Atlas**. The React app's `storage.js` service issues `fetch()` requests to `/api/*`; Express route handlers run pure Mongoose queries (`User.findOne`, `Event.create`, `Event.findByIdAndUpdate` with `$inc`, `Token.create`, etc.). The browser's localStorage only keeps the JWT login session - never app data. There is no `memoryStore.js` and no `mongodb-memory-server` anywhere in the project.

9. **Q: What is the purpose of `host: "0.0.0.0"` in the Vite configuration?**
   **A:** By default, Vite only listens on `localhost`. Setting `host: "0.0.0.0"` tells Vite to listen on all network interfaces, allowing any device (such as a mobile phone) on the same local Wi-Fi to access the application. `allowedHosts: true` additionally permits hosted preview domains.

10. **Q: How does password security work in this application?**
    **A:** Passwords are never saved in plain text. During registration in `server/routes/auth.js`, the password is encrypted using `bcrypt.hash(password, 10)` with a salt factor of 10. During login, `bcrypt.compare` verifies the submitted plain password against the stored bcrypt hash.

11. **Q: Why did you seed demo data inside `connectDB()`? Isn't that a fallback?**
    **A:** No - it runs **after** a successful Atlas connection and only when `User.countDocuments() === 0` (a completely fresh database). It inserts one demo organizer, one event, and three tokens so the app can be demonstrated immediately during evaluation. If Atlas is unreachable, no seeding happens and the error is thrown - seeding depends on Atlas, not on any local substitute.

12. **Q: Why did you choose React function components with `useState` and `useEffect` without Redux or Context API?**
    **A:** The application has simple, page-isolated state requirements. Storing state locally with `useState` and triggering data loading with `useEffect` avoids unnecessary boilerplate, maintains high readability, and makes each file easy to trace during evaluation.

---

## 4. Four Live Modification Examples (For Evaluator Requests)

### Example 1: Add a `phone` field to Token
1. In `server/models/Token.js`, add to the schema:
   ```javascript
   phone: { type: String }
   ```
2. In `server/routes/public.js`, destructure `phone` from `req.body` and include it in the new `Token`:
   ```javascript
   const { name, phone } = req.body;
   // inside new Token({ ... }):
   phone: phone || ""
   ```
3. In `client/src/pages/JoinEvent.jsx`, add state `const [phone, setPhone] = useState("")`, an input field in the form, and pass `phone` through `storage.joinEvent` into the JSON body.

### Example 2: Show token numbers formatted like `A-001`
1. In `client/src/pages/JoinEvent.jsx`, change:
   ```jsx
   <div className="number">#{myToken.tokenNumber}</div>
   ```
   to:
   ```jsx
   <div className="number">A-{String(myToken.tokenNumber).padStart(3, "0")}</div>
   ```
2. In `client/src/pages/ManageEvent.jsx`, change:
   ```jsx
   <td><strong>#{t.tokenNumber}</strong></td>
   ```
   to:
   ```jsx
   <td><strong>A-{String(t.tokenNumber).padStart(3, "0")}</strong></td>
   ```

### Example 3: Limit max tokens per event (e.g., maximum 50 tokens)
1. In `server/routes/public.js`, before incrementing, check the current count:
   ```javascript
   const currentEvent = await Event.findById(req.params.id);
   if (!currentEvent) return res.status(404).json({ message: "Event not found" });
   if (currentEvent.lastTokenNumber >= 50) {
     return res.status(400).json({ message: "Registration is full! Maximum limit reached." });
   }
   ```

### Example 4: Add a "Delete Token" button on the organizer page
1. In `server/routes/tokens.js`, add a delete route:
   ```javascript
   router.delete("/:id", async (req, res) => {
     await Token.findByIdAndDelete(req.params.id);
     return res.status(200).json({ message: "Token removed" });
   });
   ```
2. In `client/src/pages/ManageEvent.jsx`, add a delete handler:
   ```javascript
   const handleDeleteToken = async (id) => {
     const jwt = localStorage.getItem("jwt");
     await fetch(`/api/tokens/${id}`, {
       method: "DELETE",
       headers: { Authorization: `Bearer ${jwt}` },
     });
     loadData();
   };
   ```
   And add a `<button onClick={() => handleDeleteToken(t._id)} className="danger">Delete</button>` in the table row.

---

## 5. Future Scope & Enhancements

1. **Real-time Live Queue updates**: Add Server-Sent Events (SSE) or WebSockets so attendee screens and organizer tables update instantly when someone joins or is marked done.
2. **Attendee Live Wait Status**: Provide a tracking URL so attendees can see how many people are currently ahead of them in real time (`waiting` tokens with lower numbers).
3. **Duplicate Protection**: Track phone number or browser fingerprint/cookie to prevent an attendee from repeatedly generating multiple tokens.
4. **Event Status Controls**: Allow the organizer to toggle an event between "Open" and "Closed" to temporarily pause queue registrations.
5. **SMS / WhatsApp Alerts**: Integrate Twilio or an SMS gateway to send automated alerts when an attendee is 2 spots away from being called.
6. **Token Route Event Ownership Checks**: Validate in `server/routes/tokens.js` that the token being updated belongs to an event owned by the requesting organizer.
