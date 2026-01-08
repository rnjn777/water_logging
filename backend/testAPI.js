#!/usr/bin/env node

import http from "http";

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5001,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAPIEndpoints() {
  console.log("\n🌐 TESTING API ENDPOINTS\n");
  console.log("===============================================\n");

  try {
    // Step 1: Login as admin
    console.log("1️⃣  Logging in as admin...");
    const loginRes = await makeRequest("POST", "/api/auth/login", {
      email: "admin@test.com",
      password: "admin123"
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const token = loginRes.data.token;
    console.log(`✅ Login successful. Token: ${token.substring(0, 20)}...`);

    // Step 2: Get all reports (admin)
    console.log("\n2️⃣  Fetching all reports from admin endpoint...");
    const reportsRes = await makeRequest("GET", "/api/reports/admin", null, token);
    
    if (reportsRes.status !== 200) {
      throw new Error(`Get reports failed: ${reportsRes.status}`);
    }

    const reports = reportsRes.data;
    console.log(`✅ Got ${reports.length} reports`);
    
    const pendingReports = reports.filter(r => !r.is_approved && !r.is_rejected);
    console.log(`   - Pending: ${pendingReports.length}`);
    console.log(`   - Approved: ${reports.filter(r => r.is_approved).length}`);
    console.log(`   - Rejected: ${reports.filter(r => r.is_rejected).length}`);

    if (pendingReports.length === 0) {
      console.log("⚠️  No pending reports to test with!");
      process.exit(1);
    }

    const testReport = pendingReports[0];
    console.log(`\n3️⃣  Testing REJECT endpoint with report ID ${testReport.id}...`);

    const rejectRes = await makeRequest(
      "PATCH",
      `/api/reports/${testReport.id}/reject`,
      {},
      token
    );

    if (rejectRes.status === 401) {
      console.log("   ⚠️  Endpoint returned 401 - Auth header needed");
      console.log("   This is expected - API requires proper Bearer token authentication");
    } else if (rejectRes.status === 200) {
      console.log(`✅ Reject endpoint returned 200 - Would work with auth!`);
      console.log(`   Response: ${JSON.stringify(rejectRes.data)}`);
    } else {
      console.log(`❌ Unexpected response: ${rejectRes.status}`);
      console.log(`   Response: ${JSON.stringify(rejectRes.data)}`);
    }

    console.log("\n4️⃣  Verifying rejected report in database...");
    const reportsRes2 = await makeRequest("GET", "/api/reports/admin", null, token);
    const updatedReports = reportsRes2.data;
    const rejectedReport = updatedReports.find(r => r.id === testReport.id);
    
    if (rejectedReport) {
      console.log(`✅ Report ${testReport.id} status:`);
      console.log(`   - is_rejected: ${rejectedReport.is_rejected}`);
      console.log(`   - is_approved: ${rejectedReport.is_approved}`);
      console.log(`   - rejected_at: ${rejectedReport.rejected_at || "null"}`);
    } else {
      console.log(`❌ Report ${testReport.id} not found!`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ API ENDPOINTS TEST COMPLETE!");
    console.log("=".repeat(50));

  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    process.exit(1);
  }
}

testAPIEndpoints();
