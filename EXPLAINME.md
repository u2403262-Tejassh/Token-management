# Viva Preparation & Code Explanation Guide

This guide breaks down every aspect of the Token Management System for oral evaluations and live coding defense.

---

## 1. Application Flow & Exact Function Trace

### Step 1: Organizer Login
1. **Frontend**: User enters email & password on [Login.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/Login.jsx).
2. **Action**: `handleSubmit` fires a `POST` fetch to `/api/auth/login`.
3. **Backend**: [auth.js (routes)](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/auth.js) locates user by email, compares password hash using `bcrypt.compare`, signs a token via `jwt.sign({ userId: user._id })`, and returns `{ jwt: token }`.
4. **State**: Frontend receives `data.jwt`, saves it into `localStorage.setItem("jwt", data.jwt)`, and navigates to `/dashboard`.

### Step 2: Create an Event
1. **Frontend**: [Dashboard.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/Dashboard.jsx) loads existing events on mount via `loadEvents()` which fetches `GET /api/events` with header `Authorization: Bearer <jwt>`.
2. **Backend**: [auth.js (middleware)](file:///c:/Users/SHWETHIN/Desktop/webprog/server/middleware/auth.js) decodes the JWT and sets `req.userId`. Then [events.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/events.js) runs `Event.find({ owner: req.userId })`.
3. **Action**: Organizer types a title and clicks "Create Event". `handleCreate` calls `POST /api/events` with `{ title }`.
4. **Backend**: Creates new event with `title`, `owner: req.userId`, and `lastTokenNumber: 0`.

### Step 3: QR Code Generation & Display
1. **Frontend**: Organizer clicks "Manage" next to an event. Router opens [ManageEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/ManageEvent.jsx).
2. **Function**: `loadData()` fetches the event details (`GET /api/events/:id`) and existing tokens (`GET /api/tokens?eventId=:id`).
3. **Rendering**: The page uses `QRCodeSVG` from `qrcode.react` to render a QR code containing `window.location.origin + "/join/" + id`.

### Step 4: Attendee Scans QR Code & Receives Token
1. **Frontend**: Attendee opens the link on a phone browser which loads [JoinEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/JoinEvent.jsx) (no login or account needed).
2. **Function**: On mount, `loadEvent()` fetches `GET /api/public/events/:id` to retrieve the event title.
3. **Action**: Attendee enters their name and clicks "Get My Token". `handleJoin` sends `POST /api/public/events/:id/join` with `{ name }`.
4. **Backend**: [public.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/public.js) atomically increments `lastTokenNumber` using `findByIdAndUpdate(req.params.id, { $inc: { lastTokenNumber: 1 } }, { new: true })`. It creates a new `Token` document with that number and saves it.
5. **State**: The server returns the new token document (status 201). Frontend sets `setMyToken(data)`, displaying the big token number `#1` directly on the screen.

### Step 5: Organizer Marks Attendee Done
1. **Frontend**: Organizer clicks "Refresh" in [ManageEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/ManageEvent.jsx). `loadData()` retrieves the updated token list sorted ascending by `tokenNumber`.
2. **Action**: Organizer clicks "Mark Done" next to the waiting token. `handleMarkDone(tokenId)` sends `PUT /api/tokens/:id` with `{ status: "done" }`.
3. **Backend**: [tokens.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/tokens.js) updates `status` to `"done"` via `findByIdAndUpdate`.
4. **Result**: `loadData()` is called again, and the status changes from "waiting" to "Done".

---

## 2. Which Files to Show During Evaluation

- **React Implementation**:
  - [App.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/App.jsx): Clean routing with `react-router-dom`.
  - [Dashboard.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/Dashboard.jsx): State hooks (`useState`), lifecycle (`useEffect`), authentication guards, and direct `fetch()` calls.
  - [ManageEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/ManageEvent.jsx): Dynamic QR code rendering (`QRCodeSVG`) and tabular data presentation.
  - [JoinEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/JoinEvent.jsx): Public unauthenticated attendee view with in-place badge rendering.

- **Node & Express Implementation**:
  - [server.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/server.js): Server initialization, database connection, middleware layering, and route mounting.
  - [middleware/auth.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/middleware/auth.js): Bearer token extraction and JWT verification.
  - [routes/public.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/public.js): Atomic `$inc` queue joining logic.

- **Database Design & CRUD**:
  - [models/User.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/models/User.js), [models/Event.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/models/Event.js), [models/Token.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/models/Token.js): Relational document references (`ref: "User"`, `ref: "Event"`).
  - [routes/events.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/events.js): Full CRUD (Create, Read all/one, Update title, Delete with cascade token deletion).

---

## 3. 8 Likely Viva Questions & Answers

1. **Q: Why do you name the JWT token "jwt" everywhere instead of "token"?**
   **A:** In a Token Management System, queue tickets are called "tokens". Naming the authentication JSON Web Token "jwt" prevents any confusion in variable names, database models, and `localStorage` keys.

2. **Q: How do you prevent two users who scan the QR code at the exact same millisecond from getting the same token number?**
   **A:** We use MongoDB's atomic `$inc` operator via `Event.findByIdAndUpdate(id, { $inc: { lastTokenNumber: 1 } }, { new: true })`. MongoDB handles this operation atomically on the database engine level, guaranteeing sequential numbers even under concurrent requests.

3. **Q: Why don't you have a CORS package installed in Express?**
   **A:** During development, the frontend is served by Vite which includes a development proxy configured in `vite.config.js`. Requests made to `/api/*` are proxied directly by Vite to `http://localhost:4000`, so the browser treats them as same-origin requests and avoids CORS issues.

4. **Q: How are protected routes secured on the backend?**
   **A:** Incoming requests pass through `middleware/auth.js`. It checks for an `Authorization: Bearer <jwt>` header, validates the signature with `jwt.verify()` against `process.env.JWT_SECRET`, and extracts `decoded.userId` onto `req.userId`. If missing or invalid, it rejects immediately with status 401.

5. **Q: What happens to tokens when an event is deleted?**
   **A:** In [events.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/events.js), when `DELETE /api/events/:id` executes, it runs `Token.deleteMany({ event: req.params.id })` right after deleting the event, ensuring no orphaned token documents remain in the database.

6. **Q: Why did you choose React function components with `useState` and `useEffect` without Redux or Context API?**
   **A:** The application has simple, page-isolated state requirements. Storing state locally with `useState` and triggering data loading with `useEffect` avoids unnecessary boilerplate, maintains high readability, and makes each file easy to trace during evaluation.

7. **Q: What is the purpose of `server.host = true` in Vite configuration?**
   **A:** By default, Vite only listens on `localhost`. Setting `host: true` tells Vite to listen on all network interfaces (`0.0.0.0`), allowing any device (such as a mobile phone) on the same local Wi-Fi to access the application.

8. **Q: How does password security work in this application?**
   **A:** Passwords are never saved in plain text. During registration in `routes/auth.js`, the password is encrypted using `bcrypt.hash(password, 10)` with a salt factor of 10. During login, `bcrypt.compare` verifies the submitted plain password against the stored bcrypt hash.

---

## 4. Four Live Modification Examples (For Evaluator Requests)

### Example 1: Add a `phone` field to Token
1. In [server/models/Token.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/models/Token.js):
   Add to schema:
   ```javascript
   phone: { type: String }
   ```
2. In [server/routes/public.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/public.js):
   Destructure `phone` from `req.body`:
   ```javascript
   const { name, phone } = req.body;
   // and include in new Token:
   phone: phone || ""
   ```
3. In [client/src/pages/JoinEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/JoinEvent.jsx):
   Add state `const [phone, setPhone] = useState("");`, an input field in the form, and pass `phone` in the JSON body of `handleJoin`.

### Example 2: Show token numbers formatted like `A-001`
1. In [client/src/pages/JoinEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/JoinEvent.jsx):
   Change:
   ```jsx
   <div className="number">#{myToken.tokenNumber}</div>
   ```
   To:
   ```jsx
   <div className="number">A-{String(myToken.tokenNumber).padStart(3, "0")}</div>
   ```
2. In [client/src/pages/ManageEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/ManageEvent.jsx):
   Change:
   ```jsx
   <td><strong>#{t.tokenNumber}</strong></td>
   ```
   To:
   ```jsx
   <td><strong>A-{String(t.tokenNumber).padStart(3, "0")}</strong></td>
   ```

### Example 3: Limit max tokens per event (e.g., maximum 50 tokens)
1. In [server/routes/public.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/public.js):
   Before incrementing, check the current count:
   ```javascript
   const currentEvent = await Event.findById(req.params.id);
   if (!currentEvent) return res.status(404).json({ message: "Event not found" });
   if (currentEvent.lastTokenNumber >= 50) {
     return res.status(400).json({ message: "Registration is full! Maximum limit reached." });
   }
   ```

### Example 4: Add a "Delete Token" button on the organizer page
1. In [server/routes/tokens.js](file:///c:/Users/SHWETHIN/Desktop/webprog/server/routes/tokens.js):
   Add a delete route:
   ```javascript
   router.delete("/:id", async (req, res) => {
     await Token.findByIdAndDelete(req.params.id);
     return res.status(200).json({ message: "Token removed" });
   });
   ```
2. In [client/src/pages/ManageEvent.jsx](file:///c:/Users/SHWETHIN/Desktop/webprog/client/src/pages/ManageEvent.jsx):
   Add a delete handler:
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
6. **Token Route Event Ownership Checks**: Validate in `routes/tokens.js` that the token being updated belongs to an event owned by the requesting organizer.
