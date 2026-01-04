import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/db.js";

async function main() {
  const email = "admin@test.com";

  const existing = await prisma.user.findFirst({
    where: { email, role: "ADMIN" }
  });

  if (existing) {
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      name: "Admin",
      email,
      password: hashedPassword,
      role: "ADMIN"
    }
  });

  console.log("Admin user created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
