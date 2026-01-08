import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import reportRoutes from "./routes/report.routes.js"; // ✅ ADD THIS

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes); // ✅ ADD THIS

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

const PORT = process.env.PORT || 5001; // ✅ IMPORTANT for Render
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} - v1.1`);
});
