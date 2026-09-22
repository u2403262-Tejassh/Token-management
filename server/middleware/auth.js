// Authentication middleware to verify JWT and attach req.userId.
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "college_viva_secret_2026_token_system_jwt";
}

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check if Authorization header is present and formatted as Bearer token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing or invalid" });
  }

  const jwtString = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(jwtString, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
