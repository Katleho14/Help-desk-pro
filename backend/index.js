import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.js";
import ticketRoutes from "./routes/ticket.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://help-desk-pro-1.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for debugging - change in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Help Desk Pro API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      tickets: '/api/tickets/*'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
try {
  app.use('/api/auth', userRoutes);
  console.log('✅ User routes loaded');
} catch (error) {
  console.error('❌ Error loading user routes:', error.message);
}

try {
  app.use('/api/tickets', ticketRoutes);
  console.log('✅ Ticket routes loaded');
} catch (error) {
  console.error('❌ Error loading ticket routes:', error.message);
}

// Inngest routes - with error handling
try {
  // Only load Inngest if the modules are available
  const { serve } = await import("inngest/express");
  const { inngest } = await import("./inngest/client.js");
  const { onUserSignup } = await import("./inngest/functions/on-signup.js");
  const { onTicketCreated } = await import("./inngest/functions/on-ticket-create.js");
  
  app.use('/api/inngest', serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
  }));
  console.log('✅ Inngest routes loaded');
} catch (error) {
  console.warn('⚠️ Inngest not available:', error.message);
  // Continue without Inngest - app will still work
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: ['/', '/health', '/api/auth/*', '/api/tickets/*']
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    
    console.log('✅ MongoDB connected successfully');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 CORS enabled for production and development`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close((err) => {
        if (err) {
          console.error('Error during server shutdown:', err);
          process.exit(1);
        }
        console.log('Server closed');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();