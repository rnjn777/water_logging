import prisma from "./src/db.js";

async function clearAllReports() {
  try {
    console.log("🗑️ Clearing all reports from database...");

    // First, reset all user counters
    await prisma.user.updateMany({
      data: {
        total_reports: 0,
        approved_reports: 0,
        trust_score: 0
      }
    });

    console.log("✅ Reset all user counters to zero");

    // Then delete all reports
    const deleteResult = await prisma.report.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} reports from database`);

    console.log("🎉 Database cleared successfully!");
    console.log("📊 All reports removed and user trust scores reset to 0%");

  } catch (err) {
    console.error("❌ Error clearing database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllReports();