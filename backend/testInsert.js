import prisma from "./src/db.js";

async function insertTestData() {
  try {
    // Create a test admin user
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@test.com" },
      update: { role: "ADMIN" },
      create: {
        email: "admin@test.com",
        name: "Admin User",
        password: "admin123", // This is just for DB, bcrypt is done in auth
        role: "ADMIN"
      }
    });

    console.log("✅ Admin user:", adminUser);

    // Create a test regular user
    const testUser = await prisma.user.upsert({
      where: { email: "user@test.com" },
      update: {},
      create: {
        email: "user@test.com",
        name: "Test User",
        password: "user123",
        role: "USER"
      }
    });

    console.log("✅ Test user:", testUser);

    // Create test reports
    const report1 = await prisma.report.create({
      data: {
        latitude: 28.6139,
        longitude: 77.2090,
        location: "Connaught Place, New Delhi",
        severity: "HIGH",
        rainIntensity: 85,
        image: "https://res.cloudinary.com/demo/image/fetch/w_300/https://cloudinary-res.cloudinary.com/image/upload/c_scale,w_300/dam-flooding.jpg",
        user_id: testUser.id,
        is_approved: true
      }
    });

    console.log("✅ Report 1 (approved):", report1);

    const report2 = await prisma.report.create({
      data: {
        latitude: 28.5244,
        longitude: 77.1855,
        location: "Delhi Airport Road",
        severity: "MEDIUM",
        rainIntensity: 60,
        image: null,
        user_id: testUser.id,
        is_approved: false
      }
    });

    console.log("✅ Report 2 (pending):", report2);

    const report3 = await prisma.report.create({
      data: {
        latitude: 28.7041,
        longitude: 77.1025,
        location: "Dwarka, New Delhi",
        severity: "LOW",
        rainIntensity: 30,
        image: null,
        user_id: testUser.id,
        is_approved: true
      }
    });

    console.log("✅ Report 3 (approved):", report3);

    console.log("\n✅ Test data inserted successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

insertTestData();
