import prisma from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await prisma.user.findFirst({
      where: { email, role }
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
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
