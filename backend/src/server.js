import dotenv from "dotenv";
dotenv.config();

console.log("🔵 [STARTUP] Loading server file...");
console.log("🔵 [STARTUP] Environment PORT:", process.env.PORT || "not set (will use 5001)");

import express from "express";
import cors from "cors";

console.log("🔵 [STARTUP] Loading routes...");

import authRoutes from "./routes/auth.routes.js";
import reportRoutes from "./routes/report.routes.js";

console.log("🔵 [STARTUP] Routes loaded, creating Express app...");

const app = express();

// CORS configuration - improved handling for Render/Vercel and multiple frontend URLs
// You can set FRONTEND_URL or FRONTEND_URLS (comma-separated) in env to whitelist origins
const envFrontends = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOW_ALL = String(process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true';
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://water-logging.onrender.com',
  'https://water-logging-pink.vercel.app',
  ...envFrontends
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // allow non-browser requests
  if (ALLOW_ALL) return true; // debug override
  try {
    const url = new URL(origin);
    const host = url.hostname;

    // direct match
    if (allowedOrigins.includes(origin)) return true;

    // localhost patterns
    if (host === 'localhost' || host.startsWith('127.0.0.1')) return true;

    // allow Render subdomains for this project (e.g., water-logging.onrender.com or water-logging-frontend.onrender.com)
    if (host.endsWith('.onrender.com') && host.includes('water-logging')) return true;

    // allow Vercel subdomains that contain project name
    if (host.endsWith('.vercel.app') && host.includes('water-logging')) return true;

    return false;
  } catch (e) {
    return false;
  }
}

app.use(cors({
  origin: function (origin, callback) {
    const allowed = isAllowedOrigin(origin);
    console.log(`🔐 [CORS] Origin: ${origin || 'none'} -> ${allowed ? 'allowed' : 'blocked'}${ALLOW_ALL ? ' (ALLOW_ALL_ORIGINS enabled)' : ''}`);
    if (allowed) return callback(null, true);
    // tell cors middleware to not set CORS headers for disallowed origins
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
}));

// Ensure CORS preflight requests are handled quickly
app.options('*', (req, res) => res.sendStatus(204));

// Debugging endpoint: shows what origin the server receives and whether it's allowed
app.get('/debug/origin', (req, res) => {
  const origin = req.headers.origin || null;
  res.json({ origin, allowed: isAllowedOrigin(origin) });
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📥 [REQUEST] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  console.log("📥 [REQUEST] GET / - Health check");
  res.send("Backend running 🚀");
});

// Generic error handler middleware (handles CORS errors gracefully)
app.use((err, req, res, next) => {
  console.error('❌ [ERROR]', err && err.message ? err.message : err);
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed by CORS' });
  }
  // fallback for other errors
  res.status(err && err.status ? err.status : 500).json({ message: err && err.message ? err.message : 'Server error' });
});

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ [FATAL] Uncaught Exception:', error);
  console.error('❌ [FATAL] Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [FATAL] Unhandled Rejection at:', promise);
  console.error('❌ [FATAL] Reason:', reason);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Server running on port ${PORT} - v1.1`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log("=".repeat(50));
  console.log("✅ Backend is ready! Watch this terminal for logs.");
  console.log("📥 When you submit reports, you'll see logs here.");
  console.log("");
});
