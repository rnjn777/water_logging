import express from "express";
import auth, { isAdmin } from "../middleware/auth.middleware.js";
import {
  getReports,
  createReport,
  approveReport,
  deleteRejectedReports
} from "../controllers/report.controller.js";

const router = express.Router();

// Public → approved only
router.get("/", getReports);

// Admin → all reports
router.get("/admin", auth, isAdmin, getAllReportsAdmin);

// User submit
router.post("/", auth, createReport);

// Admin approve
router.patch("/:reportId/approve", auth, isAdmin, approveReport);


export default router;
