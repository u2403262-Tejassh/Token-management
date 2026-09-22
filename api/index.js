// Vercel Serverless Function entry for Express API
// Handles all /api/* requests via Express app with MongoDB Atlas

require("dotenv").config({ path: __dirname + "/../server/.env" });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "college_viva_secret_2026_token_system_jwt";
}

const { app, connectDB } = require("../server/server");

module.exports = async (req, res) => {
  // Ensure DB connected before handling request (cached after first call)
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ message: "Database connection failed", error: err.message });
  }
  return app(req, res);
};
