import express from "express";
import { getReports, createReport } from "../controllers/report.controller.js";
import auth from "../middleware/auth.middleware.js";

const router = express.Router();

// test route (keep this for now)
router.get("/test", (req, res) => {
  res.json({ message: "Reports route working ✅" });
});

// public route
router.get("/", getReports);

// protected route
router.post("/", auth, createReport);

export default router; // ✅ THIS MUST EXIST
