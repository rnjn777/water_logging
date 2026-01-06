import express from "express";
import { login, register } from "../controllers/auth.controller.js";

const router = express.Router();

// REGISTER
router.post("/register", register);

// LOGIN (✅ token will be returned)
router.post("/login", login);

export default router;
