import express from "express";
import auth, { isAdmin } from "../middleware/auth.middleware.js";
import {
  getReports,
  getAllReportsAdmin,
  createReport,
  approveReport,
  rejectReport,
  reprocessReport,
  testDetector,
  reportDiagnostic,
  deleteRejectedReports,
  recalculateTrustScores,
  clearAllReports
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
 * POST /api/reports/test-detector
 * Admin diagnostic endpoint to test detector connectivity
 */
router.post("/test-detector", auth, isAdmin, testDetector);

/**
 * GET /api/reports/:reportId/diagnostic
 * Check diagnostic info for a specific report
 */
router.get("/:reportId/diagnostic", auth, isAdmin, reportDiagnostic);

/**
 * PATCH /api/reports/:reportId/reject
 * Admin rejects report (MUST be before :reportId/approve)
 */
router.patch("/:reportId/reject", auth, isAdmin, rejectReport);

/**
 * PATCH /api/reports/:reportId/approve
 * Admin approves report
 */
router.patch("/:reportId/approve", auth, isAdmin, approveReport);

/**
 * POST /api/reports/:reportId/reprocess
 * Admin reprocesses report image via the detector (useful if detector was down during submit)
 */
router.post("/:reportId/reprocess", auth, isAdmin, reprocessReport);

/**
 * DELETE /api/reports/rejected
 * Admin deletes all pending/unapproved reports
 */
router.delete("/rejected", auth, isAdmin, deleteRejectedReports);

/**
 * POST /api/reports/recalculate-trust
 * Admin recalculates trust scores
 */
router.post("/recalculate-trust", auth, isAdmin, recalculateTrustScores);

/**
 * DELETE /api/reports/clear-all
 * Admin clears all reports and resets counters
 */
router.delete("/clear-all", auth, isAdmin, clearAllReports);

export default router;
