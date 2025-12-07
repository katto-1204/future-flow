import express, { type Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, careers, opportunities, goals, resources } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: express.Application) {
  // Auth Routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name, yearLevel, course } = req.body;

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const [user] = await db.insert(users).values({
        email,
        password,
        name,
        role: "student",
        yearLevel: parseInt(yearLevel),
        course,
      }).returning();

      req.session.userId = user.id;
      
      res.json({ user });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      console.log("🔍 Login attempt:", { email, password });

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      console.log("👤 User found:", user);

      if (!user) {
        console.log("❌ No user found");
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (password !== user.password) {
        console.log("❌ Password mismatch");
        return res.status(401).json({ error: "Invalid email or password" });
      }

      console.log("✅ Login successful");
      req.session.userId = user.id;

      res.json({ user });
    } catch (error: any) {
      console.error("💥 Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
    });

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({ user });
  });
}
