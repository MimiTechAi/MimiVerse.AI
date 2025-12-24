import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import memorystore from "memorystore";
import { AppError, getErrorMessage } from './errors';

// Validate environment variables first, before anything else
import { env } from "./env";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./storage";

const app = express();

// Security headers (Helmet.js)
// Disabled in development to prevent conflicts with Vite HMR
if (env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Monaco needs eval
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
}

import path from "path";

// Response compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// Serve Electron artifacts
// This serves files like /download/Mimiverse-linux-arm64-1.0.0.zip
app.use('/download', express.static(path.join(process.cwd(), 'out/make/zip/linux/arm64')));

// CORS configuration
const corsOptions = {
  origin: env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting Strategies (SOTA 2025 for IDEs)
import rateLimit from "express-rate-limit";

// 1. Strict limit for Authentication (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 100 : 10000, // Relaxed for Alpha
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." }
});

// 2. Moderate limit for AI endpoints (Cost control)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 requests per 15 min (~1 request every 3 seconds avg)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI rate limit exceeded. Please slow down." }
});

// 3. High limit for General IDE operations (File ops, Git, etc.)
// IDEs generate many requests (autosave, polling, tree refresh)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // 5000 requests per 15 min (~5.5 req/sec)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/preview') || req.path.startsWith('/api/auth') || req.path.startsWith('/api/ai')
});

// Apply specific limiters
app.use("/api/auth", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api", apiLimiter);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

const PgSessionStore = pgSession(session);
const MemoryStore = memorystore(session);

// Enforce SESSION_SECRET in production
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  console.warn('⚠️  WARNING: Using default SESSION_SECRET. Set SESSION_SECRET in production!');
}

const isPostgresAvailable = process.env.DATABASE_URL && pool.totalCount !== undefined;
// Note: In storage.ts refactor, pool is a mock object { totalCount: 0 } if sqlite.
// We should check if storage uses Postgres via flag or property, but strict DATABASE_URL check is safer for now.

const store = process.env.DATABASE_URL
  ? new PgSessionStore({ pool, createTableIfMissing: true })
  : new MemoryStore({ checkPeriod: 86400000 }); // Prune expired entries every 24h

app.use(session({
  store: store,
  secret: sessionSecret || "mimiverse-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: "lax"
  }
}));

import { logger } from "./utils/logger";

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logMessage = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logMessage += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logMessage.length > 80) {
        logMessage = logMessage.slice(0, 79) + "…";
      }

      logger.info(logMessage, {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Setup WebSocket for agents and terminal
  const { setupWebSockets } = await import("./websocket");
  const { agentWS, terminalWS } = setupWebSockets(server);

  // Make it globally accessible (type-safe via globals.d.ts)
  global.agentWS = agentWS;

  console.log("[Server] WebSockets initialized");

  // NOTE: Auto-indexing disabled - users should manually select projects
  // Instead of indexing the entire system, we'll provide an API endpoint
  // for users to index their chosen project directories
  console.log("[Mimiverse] Auto-indexing disabled. Use POST /api/codebase/index to index a project.");

  // Centralized error handling middleware (MUST be after all routes)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Log error for debugging
    console.error('[Error Handler]', err);

    // Handle typed AppErrors
    if (err instanceof AppError) {
      const appErr = err as InstanceType<typeof AppError>;
      return res.status(appErr.statusCode).json({
        success: false,
        error: {
          message: appErr.message,
          code: appErr.code,
          ...(appErr.details as any && { details: appErr.details })
        }
      });
    }

    // Handle unknown errors safely
    const message = getErrorMessage(err);
    res.status(500).json({
      success: false,
      error: {
        message,
        code: 'INTERNAL_ERROR'
      }
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
