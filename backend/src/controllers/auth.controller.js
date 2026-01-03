const prisma = require("../db");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email } = req.body;

  // Fake login for demo
  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
};
