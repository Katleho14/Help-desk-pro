// --------------------
// ✅ Load Environment Variables FIRST
// --------------------
import dotenv from "dotenv";
dotenv.config(); // MUST be first — ensures OpenAI sees the API key

// --------------------
// ✅ Imports
// --------------------
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.js";
import ticketRoutes from "./routes/ticket.js";
import analyzeTicket from "./utils/ai.js"; // ✅ safe to import now (dotenv is ready)

// Inngest Imports
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";

// --------------------
// ✅ Server Configuration
// --------------------
const PORT = process.env.PORT || 3000;
const app = express();

app.set("trust proxy", 1); // Required for Render

// --------------------
// ✅ CORS Setup
// --------------------
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); // allow all origins
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --------------------
// ✅ Request Logging
// --------------------
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// --------------------
// ✅ Health & Root Routes
// --------------------
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Help Desk Pro API is running!",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth/*",
      tickets: "/api/tickets/*",
      inngest: "/api/inngest/*",
      testAI: "/api/test/test-ai",
    },
    timestamp: new Date().toISOString(),
  });
});

// ✅ Prevent favicon 404 spam
app.get("/favicon.ico", (req, res) => res.status(204).end());

// --------------------
// ✅ API Routes
// --------------------
try {
  app.use("/api/auth", userRoutes);
  console.log("✅ User routes loaded");
} catch (error) {
  console.error("❌ Error loading user routes:", error.message);
}

try {
  app.use("/api/tickets", ticketRoutes);
  console.log("✅ Ticket routes loaded");
} catch (error) {
  console.error("❌ Error loading ticket routes:", error.message);
}

// --------------------
// ✅ Inngest Integration
// --------------------
try {
  app.get("/api/inngest/test", (req, res) => {
    res.json({ message: "✅ Inngest endpoint active" });
  });

  app.use(
    "/api/inngest",
    serve({
      client: inngest,
      functions: [onUserSignup, onTicketCreated],
      signingKey: process.env.INNGEST_SIGNING_KEY,
    })
  );

  console.log("✅ Inngest routes loaded successfully");
} catch (error) {
  console.error("❌ CRITICAL Inngest setup error:", error.message);
}

// --------------------
// ✅ Test AI Route (GET)
// --------------------
app.get("/api/test/test-ai", async (req, res) => {
  try {
    console.log("🚀 /api/test/test-ai called");

    const testTicket = {
      title: "React app not loading after deployment",
      description:
        "I deployed my React app on Render, but it’s showing a blank white screen.",
    };

    const result = await analyzeTicket(testTicket);
    console.log("✅ AI Result:", result);

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Error in /api/test/test-ai:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --------------------
// ✅ Global Error Handler
// --------------------
app.use((err, req, res, next) => {
  console.error("Global error handler:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// --------------------
// ✅ 404 Handler (must be last)
// --------------------
app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "/",
      "/health",
      "/api/auth/*",
      "/api/tickets/*",
      "/api/inngest/*",
      "/api/test/test-ai",
    ],
  });
});

// --------------------
// ✅ Database + Server Startup
// --------------------
const startServer = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed");
          process.exit(0);
        });
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// --------------------
// ✅ Process-Level Error Handling
// --------------------
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Start the server
startServer();



