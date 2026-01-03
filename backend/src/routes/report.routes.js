const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const {
  createReport,
  getReports
} = require("../controllers/report.controller");

router.get("/", getReports);
router.post("/", auth, createReport);

module.exports = router;
