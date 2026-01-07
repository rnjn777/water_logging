import prisma from "../db.js";

/**
 * PATCH /api/reports/:reportId/approve
 * Admin approves a report
 */
export const approveReport = async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    if (isNaN(reportId)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.is_approved) {
      return res.status(400).json({ message: "Report already approved" });
    }

    const userId = report.user_id;

    // 1️⃣ Approve report
    await prisma.report.update({
      where: { id: reportId },
      data: {
        is_approved: true,
        approved_at: new Date()
      }
    });

    // 2️⃣ Update approved_reports
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        approved_reports: { increment: 1 }
      }
    });

    // 3️⃣ Prevent divide-by-zero
    const trustScore =
      user.total_reports === 0
        ? 0
        : Math.min(
            100,
            Math.round((user.approved_reports / user.total_reports) * 100)
          );

    // 4️⃣ Save trust score
    await prisma.user.update({
      where: { id: userId },
      data: { trust_score: trustScore }
    });

    res.json({
      message: "Report approved successfully",
      trust_score: trustScore
    });
  } catch (err) {
    console.error("APPROVE REPORT ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/reports
 * Public → only approved
 * Admin  → all
 */
export const getReports = async (req, res) => {
  try {
    // Public access → approved only
    const reports = await prisma.report.findMany({
      where: { is_approved: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(reports);
  } catch (err) {
    console.error("GET REPORTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

/**
 * DELETE /api/reports/rejected
 * Admin only: Delete all reports that are not approved (pending/rejected)
 */
export const deleteRejectedReports = async (req, res) => {
  try {
    const result = await prisma.report.deleteMany({
      where: { is_approved: false }
    });
    console.log(`Deleted ${result.count} rejected reports`);
    res.json({ message: `Deleted ${result.count} rejected reports` });
  } catch (err) {
    console.error("DELETE REJECTED ERROR:", err);
    res.status(500).json({ message: "Failed to delete reports" });
  }
};

/**
 * POST /api/reports
 * Authenticated users only
 */
export const createReport = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      latitude,
      longitude,
      location,
      severity,
      rainIntensity
    } = req.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !location ||
      !severity ||
      !rainIntensity
    ) {
      return res.status(400).json({ message: "Missing or invalid fields" });
    }

    const userId = req.user.userId;

    // 1️⃣ Create report
    console.log("Creating report for user:", userId, "data:", { latitude, longitude, location, severity, rainIntensity });
    const report = await prisma.report.create({
      data: {
        latitude,
        longitude,
        location,
        severity: severity.toUpperCase(), // normalize
        rainIntensity,
        user_id: userId,
        is_approved: false
      }
    });
    console.log("Report created with id:", report.id);

    // 2️⃣ Increment total_reports
    await prisma.user.update({
      where: { id: userId },
      data: {
        total_reports: { increment: 1 }
      }
    });

    res.status(201).json(report);
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to create report" });
  }
};
