import prisma from "../db.js";
import cloudinary from "../config/cloudinary.js";

/**
 * POST /api/reports
 * User submits report (with optional image)
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
      rainIntensity,
      imageBase64
    } = req.body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !location ||
      !severity ||
      !rainIntensity
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

let imageUrl = null;

if (imageBase64) {
  console.log("Uploading image to Cloudinary...");

  const upload = await cloudinary.uploader.upload(imageBase64, {
    folder: "water-logging-reports",
    resource_type: "image"
  });

  imageUrl = upload.secure_url;
}


    const report = await prisma.report.create({
      data: {
        latitude,
        longitude,
        location,
        severity: severity.toUpperCase(),
        rainIntensity,
        image: imageUrl,
        user_id: req.user.userId,
        is_approved: false
      }
    });

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { total_reports: { increment: 1 } }
    });

    res.status(201).json(report);
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};

/**
 * PATCH /api/reports/:reportId/approve
 * Admin approves report
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

    await prisma.report.update({
      where: { id: reportId },
      data: {
        is_approved: true,
        approved_at: new Date()
      }
    });

    const user = await prisma.user.update({
      where: { id: report.user_id },
      data: { approved_reports: { increment: 1 } }
    });

    const trustScore =
      user.total_reports === 0
        ? 0
        : Math.min(
            100,
            Math.round((user.approved_reports / user.total_reports) * 100)
          );

    await prisma.user.update({
      where: { id: report.user_id },
      data: { trust_score: trustScore }
    });

    res.json({ message: "Report approved", trust_score: trustScore });
  } catch (err) {
    console.error("APPROVE REPORT ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/reports
 * Public → approved only
 */
export const getReports = async (req, res) => {
  try {
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
 * GET /api/reports/admin
 * Admin → all reports
 */
export const getAllReportsAdmin = async (req, res) => {
  try {
    console.log(`📊 ADMIN REPORTS REQUEST - User: ${req.user.userId}, Role: ${req.user.role}`);
    
    // include the reporting user so we can expose trust_score
    const reports = await prisma.report.findMany({
      include: {
        user: {
          select: { id: true, name: true, trust_score: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // sort in-memory by user's trust_score (desc). If user missing, treat as 0.
    const sorted = reports.sort((a, b) => {
      const ta = a.user && a.user.trust_score ? Number(a.user.trust_score) : 0;
      const tb = b.user && b.user.trust_score ? Number(b.user.trust_score) : 0;
      // primary sort by trust score desc, fallback to createdAt desc
      if (tb !== ta) return tb - ta;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // convert Prisma Decimal trust_score to plain Number for JSON
    const sanitized = sorted.map((r) => {
      if (r.user && r.user.trust_score !== undefined && r.user.trust_score !== null) {
        try {
          r.user.trust_score = Number(r.user.trust_score);
        } catch (e) {
          r.user.trust_score = 0;
        }
      }
      return r;
    });

    console.log(`✅ Returned ${sanitized.length} reports to admin (sorted by trust_score)`);
    res.json(sanitized);
  } catch (err) {
    console.error("ADMIN GET REPORTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

/**
 * DELETE /api/reports/rejected
 * Admin deletes all unapproved reports
 */
export const deleteRejectedReports = async (req, res) => {
  try {
    const result = await prisma.report.deleteMany({
      where: { is_approved: false }
    });
    res.json({ message: `Deleted ${result.count} rejected reports` });
  } catch (err) {
    console.error("DELETE REJECTED ERROR:", err);
    res.status(500).json({ message: "Failed to delete reports" });
  }
};
