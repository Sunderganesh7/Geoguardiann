import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../config/db.js";

const router = express.Router();

// ✅ Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user already exists
    const [existingUsers] = await getDb().execute("SELECT id FROM users WHERE email = ?", [email]);
    const existingUser = existingUsers[0];
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await getDb().execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);

    res.status(201).json({ message: "User registered successfully 🚀" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if user exists
    const [users] = await getDb().execute("SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1", [email]);
    const user = users[0];
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // create JWT token
    const token = jwt.sign({ id: String(user.id) }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, user: { id: String(user.id), name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
