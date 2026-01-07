import express from "express";
import auth, { isAdmin } from "../middleware/auth.middleware.js";
import {
  getReports,
  createReport,
  approveReport,
  deleteRejectedReports
} from "../controllers/report.controller.js";

const router = express.Router();

// PUBLIC → approved only
router.get("/", getReports);

// USER → submit report
router.post("/", auth, createReport);

// ADMIN → approve
router.patch("/:reportId/approve", auth, isAdmin, approveReport);

// ADMIN → cleanup
router.delete("/rejected", auth, isAdmin, deleteRejectedReports);

export default router;
