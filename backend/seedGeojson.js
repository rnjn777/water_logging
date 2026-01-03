import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const geojsonPath = path.join(__dirname, "../frontend/data.geojson");
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));

  for (const f of geojson.features) {
    const [lng, lat] = f.geometry.coordinates;

    await prisma.report.create({
      data: {
        latitude: lat,
        longitude: lng,
        location: f.properties.Location_Road ?? "Unknown",
        severity: f.properties.Risk.toUpperCase(),
        rainIntensity: "MODERATE"
      }
    });
  }

  console.log("✅ GeoJSON data seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
