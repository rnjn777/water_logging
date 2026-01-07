import express from "express";
import auth, { isAdmin } from "../middleware/auth.middleware.js";
import {
  getReports,
  createReport,
  approveReport,
  deleteRejectedReports
} from "../controllers/report.controller.js";

const router = express.Router();

/**
 * GET /api/reports
 * Public  → approved reports only
 * Admin   → all reports (handled inside controller)
 */
router.get("/", getReports);

/**
 * POST /api/reports
 * User submits a report (JWT required)
 */
router.post("/", auth, createReport);

/**
 * PATCH /api/reports/:reportId/approve
 * Admin approves report
 */
router.patch("/:reportId/approve", auth, isAdmin, approveReport);

/**
 * DELETE /api/reports/rejected
 * Admin deletes all pending/unapproved reports
 */
router.delete("/rejected", auth, isAdmin, deleteRejectedReports);

export default router;
