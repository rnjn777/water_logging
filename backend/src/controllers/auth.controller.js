import prisma from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log("Login attempt for email:", email, "role:", role);

    if (email === "admin@test.com") {
      // Special handling for admin
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log("Creating admin user");
        const hashedPassword = await bcrypt.hash("admin123", 10);
        user = await prisma.user.create({
          data: {
            name: "Admin",
            email,
            password: hashedPassword,
            role: "ADMIN"
          }
        });
      } else {
        // Ensure role is ADMIN
        if (user.role !== "ADMIN") {
          console.log("Updating user role to ADMIN");
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" }
          });
        }
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        console.log("Invalid password for admin");
        return res.status(401).json({ message: "Invalid password" });
      }
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      console.log("Admin login successful");
      return res.json({
        message: "Login successful",
        token,
        user: { id: user.id, email: user.email, role: user.role }
      });
    }

    const user = await prisma.user.findFirst({
      where: { email, role }
    });

    if (!user) {
      console.log("User not found for email:", email, "role:", role);
      return res.status(401).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log("Invalid password for user:", user.id);
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("Login successful for user:", user.id, "role:", user.role);
    res.json({
      message: "Login successful",
      token,
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
};

/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "USER"
      }
    });

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
