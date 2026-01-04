import prisma from "../db.js";

/**
 * GET /api/reports
 * Fetch all reports (for map display)
 */
export const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(reports);
  } catch (err) {
    console.error("GET REPORTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

/**
 * POST /api/reports
 * Create new report
 */
export const createReport = async (req, res) => {
  try {
    const { latitude, longitude, location, severity, rainIntensity } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      !location ||
      !severity ||
      !rainIntensity
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const report = await prisma.report.create({
      data: {
        latitude,
        longitude,
        location,
        severity,
        rainIntensity
      }
    });

    res.status(201).json(report);
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to create report" });
  }
};
