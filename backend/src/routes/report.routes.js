import express from "express";
import auth, { isAdmin } from "../middleware/auth.middleware.js";
import {
  getReports,
  getAllReportsAdmin,
  createReport,
  approveReport,
  deleteRejectedReports
} from "../controllers/report.controller.js";

const router = express.Router();

/**
 * GET /api/reports
 * Public → approved reports only
 */
router.get("/", getReports);

/**
 * GET /api/reports/admin
 * Admin → all reports
 */
router.get("/admin", auth, isAdmin, getAllReportsAdmin);

/**
 * POST /api/reports
 * User submits report (JWT required)
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
