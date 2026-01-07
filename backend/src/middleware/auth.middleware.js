import jwt from "jsonwebtoken";

/**
 * Auth middleware
 * Verifies JWT and attaches user to req.user
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1️⃣ Token missing
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach user (🔥 THIS MUST MATCH CONTROLLERS)
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Admin-only middleware
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export default auth;
