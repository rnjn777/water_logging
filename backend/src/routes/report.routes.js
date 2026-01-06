import express from "express";
import auth, { isAdmin } from "../middleware/auth.middleware.js";
import {
  getReports,
  createReport,
  approveReport,
  deleteRejectedReports
} from "../controllers/report.controller.js";

const router = express.Router();

// public (map) - now with optional auth
router.get("/", auth, getReports);

// protected (user submit)
router.post("/", auth, createReport);

// admin approve
router.patch("/:reportId/approve", auth, isAdmin, approveReport);

// admin delete rejected
router.delete("/rejected", auth, isAdmin, deleteRejectedReports);

export default router;
