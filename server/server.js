const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");
const { generateToken04 } = require("./ZegoServerAssistant.js");

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 token requests per windowMs
  message: {
    error: "Too many token requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', // Development
      'http://localhost:5173', // Vite dev server
      'https://yourdomain.com', // Production domain
      'https://www.yourdomain.com' // Production domain with www
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Environment validation
const requiredEnvVars = ['ZEGO_APP_ID', 'ZEGO_SERVER_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const appID = parseInt(process.env.ZEGO_APP_ID);
const serverSecret = process.env.ZEGO_SERVER_SECRET;

// Validate environment variables
if (isNaN(appID)) {
  console.error('❌ ZEGO_APP_ID must be a valid number');
  process.exit(1);
}

if (serverSecret.length !== 32) {
  console.error('❌ ZEGO_SERVER_SECRET must be exactly 32 characters');
  process.exit(1);
}

// Input validation middleware
const validateTokenRequest = [
  body('roomID')
    .isString()
    .isLength({ min: 1, max: 255 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Room ID must be alphanumeric with underscores/dashes only'),
  
  body('userID')
    .isString()
    .isLength({ min: 1, max: 64 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('User ID must be alphanumeric with underscores/dashes only'),
  
  body('userName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 64 })
    .trim()
    .escape()
    .withMessage('User name must be 1-64 characters'),
];

// Token generation endpoint
app.post("/api/get-token", tokenLimiter, validateTokenRequest, (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array()
    });
  }

  const { roomID, userID, userName } = req.body;

  try {
    const effectiveTimeInSeconds = 3600; // 1 hour - adjust as needed
    const payload = ""; // Optional payload for additional data
    
    // Generate the ZEGO token
    const token = generateToken04(
      appID, 
      userID, 
      serverSecret, 
      effectiveTimeInSeconds, 
      payload
    );

    // Log for monitoring (remove sensitive data in production logs)
    console.log(`✅ Token generated for user: ${userID}, room: ${roomID}`);

    res.json({ 
      success: true,
      token: token,
      appID: appID,
      userID: userID,
      userName: userName || userID,
      expiresIn: effectiveTimeInSeconds
    });
    
  } catch (err) {
    console.error('❌ Token generation error:', {
      userID,
      roomID,
      error: err.message || err.errorMessage,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    res.status(500).json({ 
      error: "Failed to generate token",
      message: process.env.NODE_ENV === 'development' ? 
        (err.errorMessage || err.message) : 
        "Internal server error"
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 ZEGOCLOUD token server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ App ID configured: ${!!appID}`);
  console.log(`✅ Server Secret configured: ${!!serverSecret}`);
});