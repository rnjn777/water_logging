import prisma from "../db.js";

// GET all reports (for map)
export const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE new report (from frontend)
export const createReport = async (req, res) => {
  const { latitude, longitude, location, severity, rainIntensity } = req.body;

  try {
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
    res.status(500).json({ error: err.message });
  }
};
