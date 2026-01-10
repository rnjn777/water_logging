  import prisma from "../db.js";
  import cloudinary from "../config/cloudinary.js";
import fetch from "node-fetch";

  /**
   * POST /api/reports/test-detector
   * Admin-only diagnostic endpoint to test detector connectivity
   */
  export const testDetector = async (req, res) => {
    try {
      const DETECTOR_URL = process.env.DETECTOR_URL || 'https://water-logging-detector.onrender.com/detect_url';
      console.log('🧪 Testing detector at:', DETECTOR_URL);

      // Use a public test image URL
      const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Flooded_street_in_Bangkok_%28cropped%29.jpg/640px-Flooded_street_in_Bangkok_%28cropped%29.jpg';

      const detRes = await fetch(DETECTOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: testImageUrl })
      });

      const detData = await detRes.json();
      console.log('✅ Detector test response:', detData);

      res.json({
        message: 'Detector test completed',
        detector_url: DETECTOR_URL,
        status: detRes.status,
        response: detData
      });
    } catch (err) {
      console.error('❌ Detector test failed:', err.message);
      res.status(500).json({
        message: 'Detector test failed',
        error: err.message,
        detector_url: process.env.DETECTOR_URL || 'https://water-logging-detector.onrender.com/detect',
        hint: 'Ensure the detector service is running and reachable at the DETECTOR_URL. If using production, set DETECTOR_URL env var.'
      });
    }
  };

  /**
   * GET /api/reports/:reportId/diagnostic
   * Check the actual values stored in DB for a report
   */
  export const reportDiagnostic = async (req, res) => {
    try {
      const reportId = Number(req.params.reportId);
      if (isNaN(reportId)) return res.status(400).json({ message: 'Invalid report ID' });

      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          image: true,
          processed_image: true,
          is_waterlogged: true,
          is_rejected: true,
          is_approved: true,
          createdAt: true,
          user_id: true
        }
      });

      if (!report) return res.status(404).json({ message: 'Report not found' });

      res.json({
        message: 'Report diagnostic',
        report: {
          ...report,
          has_original_image: !!report.image,
          has_processed_image: !!report.processed_image,
          processed_image_type: report.processed_image ? (report.processed_image.startsWith('data:') ? 'base64_data_uri' : 'cloudinary_url') : null,
          is_waterlogged_value: report.is_waterlogged,
          is_rejected_value: report.is_rejected
        }
      });
    } catch (err) {
      console.error('Diagnostic error:', err);
      res.status(500).json({ message: 'Diagnostic failed', error: err.message });
    }
  };
  export const createReport = async (req, res) => {
    let report = null; // ✅ ADD THIS LINE
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
  let processedImageUrl = null;
  let isWaterlogged = null;
  let confidenceScore = null;
  if (imageBase64) {
    console.log("Uploading image to Cloudinary...");

    try {
      // Add timeout to Cloudinary upload (30 seconds)
      const uploadPromise = cloudinary.uploader.upload(imageBase64, {
        folder: "water-logging-reports",
        resource_type: "image",
        access_mode: "public",
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
      console.log("✅ Image uploaded successfully", imageUrl);
      // 🔥 Normalize Cloudinary URL for ML detector
  const detectorImageUrl = imageUrl.replace(
    "/upload/",
    "/upload/f_jpg,q_auto,w_640/"
  );

  console.log("🧪 Detector-safe image URL:", detectorImageUrl);

      // Call detector service (prefer URL endpoint so we can pass Cloudinary URL)
      const DETECTOR_URL = process.env.DETECTOR_URL || 'https://water-logging-detector.onrender.com/detect_url';
      console.log(`🔍 Calling ML detector at: ${DETECTOR_URL}`);
      console.log(`📤 Sending Cloudinary URL to detector: ${detectorImageUrl}`);


      if (typeof fetch === 'undefined') {
        // Older Node runtimes may not expose fetch globally (e.g., Node <18)
        console.warn('⚠️ global fetch is not available in this Node runtime; skipping detector call. Set DETECTOR_URL to a reachable detector or upgrade Node runtime.');
      } else {
        try {
          console.log(`🌐 Making fetch request to detector...`);
          
          // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error('Detector request timeout after 180 seconds')),
      180000
    );
  });

  const detRes = await Promise.race([
    fetch(DETECTOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: detectorImageUrl })

    }),
    timeoutPromise
  ]);

          console.log(`📥 Detector response status: ${detRes?.status} ${detRes?.statusText}`);

          if (detRes && detRes.ok) {
            const detData = await detRes.json();
            console.log('🔎 Detector response data:', JSON.stringify(detData, null, 2));
            // ✅ EXTRACT CONFIDENCE SCORE
if (typeof detData.confidence === 'number') {
  confidenceScore = detData.confidence;
  console.log(`📈 Reprocess confidence score: ${confidenceScore}`);
} else {
  confidenceScore = null;
  console.log('⚠️ No confidence score from detector');
}



            // Handle detector error in response body
            if (detData.error) {
              console.error('❌ Detector returned error in response:', detData.error);
              console.error('❌ Full error response:', detData);
              // Continue anyway — detector errors don't fail the report submission
              // Keep isWaterlogged as null when there's an error
            } else {
              // Interpret waterlogged strictly only when explicitly present
              console.log(`💧 Detector waterlogged value: ${detData.waterlogged} (type: ${typeof detData.waterlogged})`);
              if (detData.waterlogged === true) {
                isWaterlogged = true;
                console.log('✅ ML Model detected WATERLOGGING');
              } else if (detData.waterlogged === false) {
                isWaterlogged = false;
                console.log('❌ ML Model detected NO waterlogging');
              } else {
                isWaterlogged = null;
                console.log('⚠️ ML Model returned unclear result (null/undefined)');
              }
            }

            if (detData.processed_image && !detData.error) {
              console.log('🖼️ Processing image received from detector...');
              // Try to upload to Cloudinary, but fallback to base64 if it fails
              try {
                const procRes = await cloudinary.uploader.upload(detData.processed_image, {
                  folder: 'water-logging-processed',
                  resource_type: 'image',
                  quality: 'auto',
                  fetch_format: 'auto'
                });
                processedImageUrl = procRes.secure_url;
                console.log('✅ Processed image uploaded to Cloudinary:', processedImageUrl);
              } catch (uploadErr) {
                console.warn('⚠️ Cloudinary upload failed (will save as base64 instead):', uploadErr.message);
                // Fallback: keep base64 data URI so frontend can display it directly
                if (typeof detData.processed_image === 'string' && detData.processed_image.startsWith('data:image')) {
                  processedImageUrl = detData.processed_image;
                  console.log('ℹ️ Using processed image base64 directly (Cloudinary not available or misconfigured)');
                }
              }
            } else {
              console.log('⚠️ No processed_image in detector response or error occurred');
            }
          } else {
            // try to get error body for more info
            let errText = '';
            try { 
              errText = await detRes.text(); 
              console.error(`❌ Detector HTTP error response body: ${errText}`);
            } catch (e) {
              console.error(`❌ Could not read error response body: ${e.message}`);
            }
            console.error(`❌ Detector did not return OK: Status ${detRes?.status} ${detRes?.statusText}`);
            console.error(`❌ Detector URL was: ${DETECTOR_URL}`);
            console.error(`❌ Image URL sent was: ${imageUrl}`);
            // Keep isWaterlogged as null when detector fails
          }
        } catch (detectorError) {
          console.error('❌ Detector request failed with exception:', detectorError.message);
          console.error('❌ Detector error stack:', detectorError.stack);
          console.error(`❌ Detector URL was: ${DETECTOR_URL}`);
          console.error(`❌ Image URL was: ${imageUrl}`);
          // Keep isWaterlogged as null when detector call fails
        }
      }
      
      console.log(`📊 Final values before saving: isWaterlogged=${isWaterlogged}, hasProcessedImage=${!!processedImageUrl}`);

    } catch (cloudinaryError) {
      console.error("❌ Cloudinary upload failed:", cloudinaryError);
      // Continue without image rather than failing the entire report
      console.log("⚠️ Continuing without image due to upload failure");
    }
  }


      try {
        report = await prisma.report.create({
          data: {
            latitude,
            longitude,
            location,
            severity: severity.toUpperCase(),
            rainIntensity,
            image: imageUrl,
            processed_image: processedImageUrl,
            is_waterlogged: isWaterlogged,
            confidence_score: confidenceScore,
            user_id: req.user.userId,
            is_approved: false,
            // If detector explicitly says NOT waterlogged, mark rejected immediately
            is_rejected: isWaterlogged === false ? true : false,
            rejected_at: isWaterlogged === false ? new Date() : null
          }
        });

      } catch (createErr) {
        // This commonly happens if DB schema does not include the new columns (migration not applied).
        console.error('❌ Prisma create failed when saving processed fields - falling back to minimal create:', createErr.message || createErr);

        try {
          // Retry without fields that may not exist on older DBs
          report = await prisma.report.create({
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

          console.warn('⚠️ Report created without processed_image/is_waterlogged fields. Please apply Prisma migration to add these columns on the database.');

          // If detector said NOT waterlogged, mark a warning so admin can reprocess after migration
          if (isWaterlogged === false) {
            console.warn('⚠️ Detector indicated NOT waterlogged but DB could not record it. After running migration, call the reprocess endpoint to apply the rejection.');
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback create also failed:', fallbackErr);
          return res.status(500).json({ message: 'Failed to submit report (DB create failed)' });
        }
      }

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
      console.log('ℹ️ report.processed_image:', report.processed_image, 'is_waterlogged:', report.is_waterlogged);
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
   * POST /api/reports/:reportId/reprocess
   * Admin → re-run detector on an existing report image and save processed image / waterlogged flag
   */
  export const reprocessReport = async (req, res) => {
    try {
      const reportId = Number(req.params.reportId);
      if (isNaN(reportId)) return res.status(400).json({ message: 'Invalid report ID' });

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) return res.status(404).json({ message: 'Report not found' });
      if (!report.image) return res.status(400).json({ message: 'Report has no original image to process' });

      const DETECTOR_URL = process.env.DETECTOR_URL || 'https://water-logging-detector.onrender.com/detect_url';
      let isWaterlogged = null;
      let processedImageUrl = null;
      let confidenceScore = null; // 👈 ADD THIS


      try {
const detectorImageUrl = report.image.replace(
  "/upload/",
  "/upload/f_jpg,q_auto,w_640/"
);

const detRes = await fetch(DETECTOR_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image_url: detectorImageUrl })
});


        if (detRes && detRes.ok) {
          const detData = await detRes.json();
          console.log('🔁 Reprocess detector response for report', reportId, detData);
          // ✅ EXTRACT CONFIDENCE SCORE
if (typeof detData.confidence === 'number') {
  confidenceScore = detData.confidence;
  console.log(`📈 Reprocess confidence score: ${confidenceScore}`);
} else {
  confidenceScore = null;
  console.log('⚠️ No confidence score from detector');
}


          if (detData.waterlogged === true) isWaterlogged = true;
          else if (detData.waterlogged === false) isWaterlogged = false;

          if (detData.processed_image) {
            try {
              const procRes = await cloudinary.uploader.upload(detData.processed_image, {
                folder: 'water-logging-processed',
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto'
              });
              processedImageUrl = procRes.secure_url;
              console.log('✅ Reprocessed image uploaded:', processedImageUrl);
            } catch (uploadErr) {
              console.error('❌ Reprocessed upload failed:', uploadErr);
              if (typeof detData.processed_image === 'string' && detData.processed_image.startsWith('data:image')) {
                processedImageUrl = detData.processed_image;
                console.log('ℹ️ Using reprocessed base64 fallback');
              }
            }
          }
        } else {
          const errText = await (detRes.text().catch(() => ''));
          console.warn('⚠️ Reprocess detector not OK:', detRes && detRes.status, errText);
        }
      } catch (err) {
        console.error('❌ Reprocess detector call failed:', err);
      }
const update = await prisma.report.update({
  where: { id: reportId },
  data: {
    processed_image: processedImageUrl,
    is_waterlogged: isWaterlogged,
    confidence_score: confidenceScore, // 👈 ADD THIS
    is_rejected: isWaterlogged === false ? true : undefined,
    rejected_at: isWaterlogged === false ? new Date() : undefined
  }
});


      res.json({ message: 'Reprocessed', report: update });
    } catch (err) {
      console.error('REPROCESS REPORT ERROR:', err);
      res.status(500).json({ message: 'Internal server error' });
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
  where: {
    is_approved: false
  }
});


      res.json({ message: `Deleted ${result.count} rejected reports` });
    } catch (err) {
      console.error("DELETE REJECTED ERROR:", err);
      res.status(500).json({ message: "Failed to delete reports" });
    }
  };


export const clearAllReports = async (req, res) => {
  try {
    console.log("🧹 Clearing non-approved reports only...");

    // 1️⃣ Delete only pending + rejected reports
    const deleteResult = await prisma.report.deleteMany({
      where: {
        is_approved: false
      }
    });

    // 2️⃣ Recalculate user stats ONLY from remaining (approved) reports
    const users = await prisma.user.findMany({
      include: { reports: true }
    });

    for (const user of users) {
      const approvedReports = user.reports.filter(r => r.is_approved).length;
      const totalReports = user.reports.length;

      const trustScore =
        totalReports === 0
          ? 0
          : Math.min(100, Math.round((approvedReports / totalReports) * 100));

      await prisma.user.update({
        where: { id: user.id },
        data: {
          total_reports: totalReports,
          approved_reports: approvedReports,
          trust_score: trustScore
        }
      });
    }

    console.log(`✅ Deleted ${deleteResult.count} non-approved reports`);

    res.json({
      message: `Cleared ${deleteResult.count} pending/rejected reports. Approved reports preserved.`
    });

  } catch (err) {
    console.error("CLEAR NON-APPROVED ERROR:", err);
    res.status(500).json({ message: "Failed to clear reports" });
  }
};
