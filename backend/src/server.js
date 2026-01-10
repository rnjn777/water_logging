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

// CORS configuration for local development - allow all localhost origins
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman, or same-origin)
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
