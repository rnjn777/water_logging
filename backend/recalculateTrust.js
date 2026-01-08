import prisma from "./src/db.js";

async function recalculateTrustScores() {
  try {
    console.log("🔄 Recalculating trust scores for all users...");

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        reports: true
      }
    });

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

      console.log(`✅ User ${user.email}: total=${totalReports}, approved=${approvedReports}, trust=${trustScore}%`);
    }

    console.log("🎉 Trust scores recalculated successfully!");
  } catch (err) {
    console.error("❌ Error recalculating trust scores:", err);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateTrustScores();</content>
<parameter name="filePath">d:\git\water_logging\backend\recalculateTrust.js