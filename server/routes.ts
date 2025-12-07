import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import {
  loginSchema, registerSchema,
  insertProfileSchema, insertGoalSchema, insertCareerSchema,
  insertOpportunitySchema, insertResourceSchema, insertProgressRecordSchema,
  insertAcademicModuleSchema, insertTrainingProgramSchema,
} from "@shared/schema";
import { z } from "zod";
import pgSession from "connect-pg-simple";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  storage.getUser(req.session.userId).then(user => {
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = pgSession(session);

  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        yearLevel: data.yearLevel,
        course: data.course || "Computer Engineering",
        role: "student",
      });

      // Create empty profile for user
      await storage.createProfile({
        userId: user.id,
        skills: [],
        interests: [],
        certifications: [],
        careerPreferences: [],
        subjectsTaken: [],
      });

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const isValidPassword = await verifyPassword(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const stats = await storage.getDashboardStats(req.session.userId!);
    res.json(stats);
  });

  // Profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    const profile = await storage.getProfile(req.session.userId!);
    res.json(profile || null);
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getProfile(req.session.userId!);
      if (existing) {
        const updated = await storage.updateProfile(req.session.userId!, req.body);
        res.json(updated);
      } else {
        const profile = await storage.createProfile({
          userId: req.session.userId!,
          ...req.body,
        });
        res.json(profile);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getProfile(req.session.userId!);
      if (existing) {
        const updated = await storage.updateProfile(req.session.userId!, req.body);
        res.json(updated);
      } else {
        const profile = await storage.createProfile({
          userId: req.session.userId!,
          ...req.body,
        });
        res.json(profile);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Goals routes
  app.get("/api/goals", requireAuth, async (req, res) => {
    const userGoals = await storage.getGoals(req.session.userId!);
    res.json(userGoals);
  });

  app.get("/api/goals/recent", requireAuth, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const recentGoals = await storage.getRecentGoals(req.session.userId!, limit);
    res.json(recentGoals);
  });

  app.get("/api/goals/:id", requireAuth, async (req, res) => {
    const goal = await storage.getGoal(req.params.id);
    if (!goal || goal.userId !== req.session.userId) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(goal);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const data = insertGoalSchema.parse({ ...req.body, userId: req.session.userId! });
      const goal = await storage.createGoal(data);
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.put("/api/goals/:id", requireAuth, async (req, res) => {
    const goal = await storage.getGoal(req.params.id);
    if (!goal || goal.userId !== req.session.userId) {
      return res.status(404).json({ error: "Goal not found" });
    }
    const updated = await storage.updateGoal(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    const goal = await storage.getGoal(req.params.id);
    if (!goal || goal.userId !== req.session.userId) {
      return res.status(404).json({ error: "Goal not found" });
    }
    await storage.deleteGoal(req.params.id);
    res.json({ success: true });
  });

  // Careers routes
  app.get("/api/careers", async (req, res) => {
    const allCareers = await storage.getCareers();
    res.json(allCareers);
  });

  app.get("/api/careers/recommended", requireAuth, async (req, res) => {
    const profile = await storage.getProfile(req.session.userId!);
    const skills = profile?.skills || [];
    const recommended = await storage.getRecommendedCareers(skills);
    res.json(recommended);
  });

  app.get("/api/careers/:id", async (req, res) => {
    const career = await storage.getCareer(req.params.id);
    if (!career) {
      return res.status(404).json({ error: "Career not found" });
    }
    res.json(career);
  });

  app.post("/api/careers", requireAdmin, async (req, res) => {
    try {
      const data = insertCareerSchema.parse(req.body);
      const career = await storage.createCareer(data);
      res.json(career);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create career" });
    }
  });

  app.put("/api/careers/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateCareer(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/careers/:id", requireAdmin, async (req, res) => {
    await storage.deleteCareer(req.params.id);
    res.json({ success: true });
  });

  // Opportunities routes
  app.get("/api/opportunities", async (req, res) => {
    const type = req.query.type as string | undefined;
    const industry = req.query.industry as string | undefined;
    const allOpportunities = await storage.getOpportunities({ type, industry });
    res.json(allOpportunities);
  });

  app.get("/api/opportunities/latest", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 6;
    const latest = await storage.getLatestOpportunities(limit);
    res.json(latest);
  });

  app.get("/api/opportunities/:id", async (req, res) => {
    const opportunity = await storage.getOpportunity(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ error: "Opportunity not found" });
    }
    res.json(opportunity);
  });

  app.post("/api/opportunities", requireAdmin, async (req, res) => {
    try {
      const data = insertOpportunitySchema.parse(req.body);
      const opportunity = await storage.createOpportunity(data);
      res.json(opportunity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create opportunity" });
    }
  });

  app.put("/api/opportunities/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateOpportunity(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/opportunities/:id", requireAdmin, async (req, res) => {
    await storage.deleteOpportunity(req.params.id);
    res.json({ success: true });
  });

  // Saved opportunities routes
  app.get("/api/saved-opportunities", requireAuth, async (req, res) => {
    const saved = await storage.getSavedOpportunities(req.session.userId!);
    res.json(saved);
  });

  app.post("/api/saved-opportunities", requireAuth, async (req, res) => {
    const { opportunityId } = req.body;
    
    const isSaved = await storage.isOpportunitySaved(req.session.userId!, opportunityId);
    if (isSaved) {
      return res.status(400).json({ error: "Already saved" });
    }
    
    const saved = await storage.saveOpportunity({
      userId: req.session.userId!,
      opportunityId,
    });
    res.json(saved);
  });

  app.delete("/api/saved-opportunities/:opportunityId", requireAuth, async (req, res) => {
    await storage.unsaveOpportunity(req.session.userId!, req.params.opportunityId);
    res.json({ success: true });
  });

  app.get("/api/saved-opportunities/:opportunityId/check", requireAuth, async (req, res) => {
    const isSaved = await storage.isOpportunitySaved(req.session.userId!, req.params.opportunityId);
    res.json({ isSaved });
  });

  // Resources routes
  app.get("/api/resources", async (req, res) => {
    const type = req.query.type as string | undefined;
    const category = req.query.category as string | undefined;
    const allResources = await storage.getResources({ type, category });
    res.json(allResources);
  });

  app.get("/api/resources/:id", async (req, res) => {
    const resource = await storage.getResource(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    res.json(resource);
  });

  app.post("/api/resources", requireAdmin, async (req, res) => {
    try {
      const data = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(data);
      res.json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create resource" });
    }
  });

  app.put("/api/resources/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateResource(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/resources/:id", requireAdmin, async (req, res) => {
    await storage.deleteResource(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/resources/:id/download", async (req, res) => {
    await storage.incrementResourceDownload(req.params.id);
    res.json({ success: true });
  });

  // Progress records routes
  app.get("/api/progress", requireAuth, async (req, res) => {
    const records = await storage.getProgressRecords(req.session.userId!);
    res.json(records);
  });

  app.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const data = insertProgressRecordSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const record = await storage.createProgressRecord(data);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create progress record" });
    }
  });

  app.put("/api/progress/:id", requireAuth, async (req, res) => {
    const updated = await storage.updateProgressRecord(req.params.id, req.body);
    res.json(updated);
  });

  // Academic modules routes
  app.get("/api/academic-modules", requireAuth, async (req, res) => {
    const modules = await storage.getAcademicModules(req.session.userId!);
    res.json(modules);
  });

  app.post("/api/academic-modules", requireAuth, async (req, res) => {
    try {
      const data = insertAcademicModuleSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const module = await storage.createAcademicModule(data);
      res.json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create academic module" });
    }
  });

  app.put("/api/academic-modules/:id", requireAuth, async (req, res) => {
    const updated = await storage.updateAcademicModule(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/academic-modules/:id", requireAuth, async (req, res) => {
    await storage.deleteAcademicModule(req.params.id);
    res.json({ success: true });
  });

  // Training programs routes
  app.get("/api/training-programs", async (req, res) => {
    const programs = await storage.getTrainingPrograms();
    res.json(programs);
  });

  app.get("/api/training-programs/:id", async (req, res) => {
    const program = await storage.getTrainingProgram(req.params.id);
    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }
    res.json(program);
  });

  app.post("/api/training-programs", requireAdmin, async (req, res) => {
    try {
      const data = insertTrainingProgramSchema.parse(req.body);
      const program = await storage.createTrainingProgram(data);
      res.json(program);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create training program" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    // For now, return empty array - would need to implement getAllUsers in storage
    res.json([]);
  });

  return httpServer;
}
