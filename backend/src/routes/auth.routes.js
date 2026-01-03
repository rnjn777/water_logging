import express from "express";
import bcrypt from "bcrypt";
import prisma from "../db.js";

const router = express.Router();

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    console.log("➡️ Register hit");
    console.log("BODY:", req.body);

    const { email, password, role, name } = req.body;

    const exists = await prisma.user.findFirst({
      where: { email, role }
    });

    console.log("EXISTS:", exists);

    const hashed = await bcrypt.hash(password, 10);
    console.log("HASHED OK");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role
      }
    });


    console.log("USER CREATED:", user);

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await prisma.user.findFirst({
      where: { email, role }
    });

    if (!user) {
      return res.status(404).json({ code: "USER_NOT_FOUND" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
