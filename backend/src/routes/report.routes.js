const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const {
  createReport,
  getReports
} = require("../controllers/report.controller");

// GET all reports (public – for map)
router.get("/", getReports);

// CREATE report (protected)
router.post("/", auth, createReport);

module.exports = router;
