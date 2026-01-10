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
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://water-logging-pink.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);

    // ❗ DO NOT throw error — just deny quietly
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Preflight handling (IMPORTANT)
app.options("*", cors());


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
