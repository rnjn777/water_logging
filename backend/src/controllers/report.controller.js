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

  try {
    // Add timeout to Cloudinary upload (30 seconds)
    const uploadPromise = cloudinary.uploader.upload(imageBase64, {
      folder: "water-logging-reports",
      resource_type: "image",
      timeout: 30000, // 30 second timeout
      // Optimize image on upload
      quality: "auto",
      fetch_format: "auto",
      width: 800,
      height: 800,
      crop: "limit"
    });

    const uploadResult = await uploadPromise;
    imageUrl = uploadResult.secure_url;
    console.log("✅ Image uploaded successfully");
  } catch (cloudinaryError) {
    console.error("❌ Cloudinary upload failed:", cloudinaryError);
    // Continue without image rather than failing the entire report
    console.log("⚠️ Continuing without image due to upload failure");
  }
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

    // Update user counters with timeout
    await Promise.race([
      prisma.user.update({
        where: { id: req.user.userId },
        data: { total_reports: { increment: 1 } }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 10000)
      )
    ]);

    console.log(`✅ Report created: ${report.id} for user ${req.user.userId}`);
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

    // increment approved_reports first
    await prisma.user.update({
      where: { id: report.user_id },
      data: { approved_reports: { increment: 1 } }
    });

    // fetch fresh user counts to avoid stale/typed values from the update result
    const updatedUser = await prisma.user.findUnique({ where: { id: report.user_id } });

    const totalReports = updatedUser && updatedUser.total_reports ? Number(updatedUser.total_reports) : 0;
    const approvedReports = updatedUser && updatedUser.approved_reports ? Number(updatedUser.approved_reports) : 0;

    const trustScore =
      totalReports === 0
        ? 0
        : Math.min(100, Math.round((approvedReports / totalReports) * 100));

    await prisma.user.update({
      where: { id: report.user_id },
      data: { trust_score: trustScore }
    });

    console.log(`APPROVE_REPORT: reportId=${reportId} userId=${report.user_id} approved=${approvedReports} total=${totalReports} trustScore=${trustScore}`);

    res.json({ message: "Report approved", trust_score: trustScore });
  } catch (err) {
    console.error("APPROVE REPORT ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * PATCH /api/reports/:reportId/reject
 * Admin rejects report
 */
export const rejectReport = async (req, res) => {
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

    if (report.is_rejected) {
      return res.status(400).json({ message: "Report already rejected" });
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        is_rejected: true,
        rejected_at: new Date()
      }
    });

    console.log(`REJECT_REPORT: reportId=${reportId} userId=${report.user_id}`);

    res.json({ message: "Report rejected" });
  } catch (err) {
    console.error("REJECT REPORT ERROR:", err);
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

    // Log reports without user_id
    const reportsWithoutUser = reports.filter(r => !r.user_id);
    if (reportsWithoutUser.length > 0) {
      console.log(`⚠️ Found ${reportsWithoutUser.length} reports without user_id:`, reportsWithoutUser.map(r => r.id));
    }

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
 * POST /api/reports/recalculate-trust
 * Admin recalculates trust scores for all users
 */
export const recalculateTrustScores = async (req, res) => {
  try {
    console.log("🔄 Recalculating trust scores for all users...");

    // Get all users with their reports
    const users = await prisma.user.findMany({
      include: {
        reports: true
      }
    });

    let updatedCount = 0;

    for (const user of users) {
      const totalReports = user.reports.length;
      const approvedReports = user.reports.filter(r => r.is_approved).length;

      const trustScore = totalReports === 0 ? 0 : Math.min(100, Math.round((approvedReports / totalReports) * 100));

      await prisma.user.update({
        where: { id: user.id },
        data: {
          total_reports: totalReports,
          approved_reports: approvedReports,
          trust_score: trustScore
        }
      });

      updatedCount++;
      console.log(`✅ User ${user.email}: total=${totalReports}, approved=${approvedReports}, trust=${trustScore}%`);
    }

    console.log(`🎉 Trust scores recalculated for ${updatedCount} users!`);
    res.json({ message: `Trust scores recalculated for ${updatedCount} users` });
  } catch (err) {
    console.error("RECALCULATE TRUST ERROR:", err);
    res.status(500).json({ message: "Failed to recalculate trust scores" });
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

/**
 * DELETE /api/reports/clear-all
 * Admin clears all reports and resets user counters
 */
export const clearAllReports = async (req, res) => {
  try {
    console.log("🗑️ Admin clearing all reports...");

    // Reset all user counters
    await prisma.user.updateMany({
      data: {
        total_reports: 0,
        approved_reports: 0,
        trust_score: 0
      }
    });

    // Delete all reports
    const deleteResult = await prisma.report.deleteMany({});

    console.log(`✅ Cleared ${deleteResult.count} reports and reset all user counters`);
    res.json({
      message: `Successfully cleared ${deleteResult.count} reports and reset all user trust scores to 0%`
    });
  } catch (err) {
    console.error("CLEAR ALL REPORTS ERROR:", err);
    res.status(500).json({ message: "Failed to clear reports" });
  }
};
