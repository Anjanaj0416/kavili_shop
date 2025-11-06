import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import productRouter from './routes/productRouter.js';
import userRouter from './routes/userRouter.js';
import orderRouter from './routes/orderRouter.js';
import adminRouter from './routes/adminRouter.js';
import contactRouter from './routes/contactRouter.js';
import aboutRouter from './routes/aboutRouter.js';
import reviewRouter from './routes/reviewRouter.js';
import { 
    securityHeaders, 
    rateLimiter,
    authRateLimiter,
    sqlInjectionProtection,
    xssProtection,
    noSqlInjectionProtection,
    securityAuditLogger
} from "./middleware/security.js";

dotenv.config()

console.log('Environment variables check:');
console.log('SECRET:', process.env.SECRET ? 'Available' : 'Missing');
console.log('MONGO_DB_URI:', process.env.MONGO_DB_URI ? 'Available' : 'Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

const app = express();

const mongoUrl = process.env.MONGO_DB_URI

// ============================================
// SECURITY MIDDLEWARE (Applied First)
// ============================================

// 1. Security Headers - Protect against common attacks
app.use(securityHeaders);

// 2. CORS Configuration - Control which origins can access the API
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://kavili-shop-b9472.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// 3. SQL Injection Protection
app.use(sqlInjectionProtection);

// 4. XSS Protection
app.use(xssProtection);

// 5. NoSQL Injection Protection
app.use(noSqlInjectionProtection);

// 6. Security Audit Logging
app.use(securityAuditLogger);

// 7. General Rate Limiting (100 requests per minute)
app.use(rateLimiter(100, 60000));

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.connect(mongoUrl, {})
  .then(() => {
    console.log("✓ Database connected successfully");
  })
  .catch((error) => {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  });

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("✓ MongoDB connection established");
});

connection.on("error", (error) => {
  console.error("✗ MongoDB connection error:", error);
});

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

// Increase payload limit for Base64 images
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================

app.use(
  (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    
    if (token != null) {
      jwt.verify(token, process.env.SECRET, (error, decoded) => {
        if (!error) {
          req.user = decoded        
        }
      })
    }
    next()
  }
)

// ============================================
// REQUEST LOGGING MIDDLEWARE
// ============================================

app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    
    // Only log body for non-sensitive routes (exclude passwords, tokens)
    if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        
        // Remove sensitive fields from logs
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
        if (sanitizedBody.googleId) sanitizedBody.googleId = '[REDACTED]';
        
        console.log('Request body:', JSON.stringify(sanitizedBody, null, 2));
    }
    next();
});

// ============================================
// API ROUTES
// ============================================

// Apply stricter rate limiting for authentication routes
app.use("/api/users/login", authRateLimiter);
app.use("/api/users/register", authRateLimiter);
app.use("/api/admin/login", authRateLimiter);

// Main route handlers
app.use("/api/products", productRouter);
app.use("/api/users", userRouter);
app.use("/api/orders", orderRouter);
app.use("/api/admin", adminRouter);
app.use("/api/contact", contactRouter);
app.use("/api/about", aboutRouter);
app.use("/api/reviews", reviewRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 Handler - Route not found
app.use((req, res) => {
  console.log(`⚠ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false,
    message: `Route not found: ${req.method} ${req.path}` 
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error('✗ Unhandled error:', error);
    console.error('Error stack:', error.stack);
    
    // Don't expose error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(error.status || 500).json({
        success: false,
        message: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
    });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Udari Online Shop - Backend Server');
    console.log('='.repeat(50));
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Security middleware: ENABLED`);
    console.log(`✓ Rate limiting: ENABLED`);
    console.log(`✓ CORS: CONFIGURED`);
    console.log('='.repeat(50) + '\n');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});