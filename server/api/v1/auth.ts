import { Router } from 'express';
import { requireAuth } from '../../auth/middleware';
import { storage } from '../../storage';
import { insertUserSchema } from '@shared/schema';
import bcrypt from 'bcrypt';

export const authRoutes = Router();

// POST /api/v1/auth/register
authRoutes.post('/register', async (req, res) => {
    try {
        const parsed = insertUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid input", errors: parsed.error });
        }

        const existingUser = await storage.getUserByUsername(parsed.data.username);
        if (existingUser) {
            return res.status(409).json({ message: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        const newUser = await storage.createUser({
            username: parsed.data.username,
            password: hashedPassword,
        });

        // Auto-login after registration
        req.session.userId = newUser.id;
        res.json({ id: newUser.id, username: newUser.username });
    } catch (error: unknown) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/v1/auth/login
authRoutes.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password required" });
        }

        const user = await storage.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        req.session.userId = user.id;
        res.json({ id: user.id, username: user.username });
    } catch (error: unknown) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/v1/auth/logout
authRoutes.post('/logout', requireAuth, async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
    });
});

// GET /api/v1/auth/me
authRoutes.get('/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        res.json({ id: user.id, username: user.username });
    } catch (error: unknown) {
        res.status(500).json({ message: "Internal server error" });
    }
});
