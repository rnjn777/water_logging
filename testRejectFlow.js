const API_BASE_URL = "https://water-logging.onrender.com";

// Test data
let testUserId = null;
let testReportId = null;
let adminToken = null;

async function testRejectFlow() {
  try {
    console.log("🧪 TESTING REJECT REPORT FLOW\n");

    // Step 1: Register admin user
    console.log("Step 1️⃣: Registering admin user...");
    const registerRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Admin",
        email: "testadmin@test.com",
        password: "TestAdmin123",
        isAdmin: true
      })
    });

    if (!registerRes.ok) {
      console.error("❌ Register failed:", registerRes.status);
      return;
    }

    console.log("✅ Admin registered\n");

    // Step 2: Login as admin
    console.log("Step 2️⃣: Login admin...");
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "testadmin@test.com",
        password: "TestAdmin123"
      })
    });

    if (!loginRes.ok) {
      console.error("❌ Login failed:", loginRes.status);
      return;
    }

    const loginData = await loginRes.json();
    adminToken = loginData.token;
    console.log("✅ Admin logged in\n");

    // Step 3: Register a regular user
    console.log("Step 3️⃣: Registering regular user...");
    const userRegisterRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "testuser@test.com",
        password: "TestUser123"
      })
    });

    if (!userRegisterRes.ok) {
      console.error("❌ User register failed:", userRegisterRes.status);
      return;
    }

    console.log("✅ User registered\n");

    // Step 4: Login as user
    console.log("Step 4️⃣: Login user...");
    const userLoginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "testuser@test.com",
        password: "TestUser123"
      })
    });

    if (!userLoginRes.ok) {
      console.error("❌ User login failed:", userLoginRes.status);
      return;
    }

    const userLoginData = await userLoginRes.json();
    const userToken = userLoginData.token;
    testUserId = userLoginData.user.id;
    console.log(`✅ User logged in (ID: ${testUserId})\n`);

    // Step 5: User creates a report
    console.log("Step 5️⃣: User submits a report...");
    const reportRes = await fetch(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        latitude: 28.6139,
        longitude: 77.2090,
        location: "Test Location",
        severity: "HIGH",
        rainIntensity: "HEAVY"
      })
    });

    if (!reportRes.ok) {
      console.error("❌ Report creation failed:", reportRes.status);
      return;
    }

    const reportData = await reportRes.json();
    testReportId = reportData.id;
    console.log(`✅ Report created (ID: ${testReportId})\n`);

    // Step 6: Admin views all reports (should see PENDING)
    console.log("Step 6️⃣: Admin views all reports...");
    const viewRes1 = await fetch(`${API_BASE_URL}/api/reports/admin`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });

    if (!viewRes1.ok) {
      console.error("❌ View reports failed:", viewRes1.status);
      return;
    }

    const reports1 = await viewRes1.json();
    const report1 = reports1.find(r => r.id === testReportId);
    console.log(`✅ Report found: is_approved=${report1.is_approved}, is_rejected=${report1.is_rejected}\n`);

    // Step 7: Admin REJECTS the report
    console.log("Step 7️⃣: Admin rejects the report...");
    const rejectRes = await fetch(`${API_BASE_URL}/api/reports/${testReportId}/reject`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      }
    });

    if (!rejectRes.ok) {
      console.error("❌ Reject failed:", rejectRes.status);
      return;
    }

    const rejectData = await rejectRes.json();
    console.log(`✅ Report rejected: ${rejectData.message}\n`);

    // Step 8: Admin views reports again (should show REJECTED)
    console.log("Step 8️⃣: Admin views reports again (checking rejection persists in DB)...");
    const viewRes2 = await fetch(`${API_BASE_URL}/api/reports/admin`, {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });

    if (!viewRes2.ok) {
      console.error("❌ View reports failed:", viewRes2.status);
      return;
    }

    const reports2 = await viewRes2.json();
    const report2 = reports2.find(r => r.id === testReportId);
    console.log(`✅ Report status in DB: is_approved=${report2.is_approved}, is_rejected=${report2.is_rejected}`);
    
    if (report2.is_rejected) {
      console.log("✅ ✅ ✅ REJECTED STATUS PERSISTS IN DATABASE!\n");
    } else {
      console.log("❌ ❌ ❌ REJECTED STATUS NOT PERSISTING!\n");
    }

    // Step 9: Logout and simulate app restart
    console.log("Step 9️⃣: Simulating logout and app restart (checking persistence)...\n");

    // Step 10: Login again as admin
    console.log("Step 1️⃣0️⃣: Admin logs in again...");
    const reLoginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "testadmin@test.com",
        password: "TestAdmin123"
      })
    });

    if (!reLoginRes.ok) {
      console.error("❌ Re-login failed:", reLoginRes.status);
      return;
    }

    const reLoginData = await reLoginRes.json();
    const newAdminToken = reLoginData.token;
    console.log("✅ Admin logged in again\n");

    // Step 11: Check if report is still rejected
    console.log("Step 1️⃣1️⃣: Admin fetches reports (FINAL CHECK)...");
    const viewRes3 = await fetch(`${API_BASE_URL}/api/reports/admin`, {
      headers: { "Authorization": `Bearer ${newAdminToken}` }
    });

    if (!viewRes3.ok) {
      console.error("❌ View reports failed:", viewRes3.status);
      return;
    }

    const reports3 = await viewRes3.json();
    const report3 = reports3.find(r => r.id === testReportId);
    console.log(`✅ Report status after re-login: is_approved=${report3.is_approved}, is_rejected=${report3.is_rejected}`);
    
    if (report3.is_rejected) {
      console.log("\n🎉 🎉 🎉 SUCCESS! REJECTION STATUS PERSISTS AFTER LOGOUT/LOGIN! 🎉 🎉 🎉\n");
    } else {
      console.log("\n❌ ❌ ❌ FAILURE! REJECTION STATUS LOST AFTER LOGOUT/LOGIN! ❌ ❌ ❌\n");
    }

  } catch (err) {
    console.error("💥 ERROR:", err.message);
  }
}

testRejectFlow();
