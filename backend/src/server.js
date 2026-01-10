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

// CORS configuration - allow localhost for local dev and production frontend origin(s)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL || 'https://water-logging.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin)
    if (!origin) {
      return callback(null, true);
    }
    // Allow explicit localhost patterns or entries in allowedOrigins
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    console.warn('⚠️ CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
