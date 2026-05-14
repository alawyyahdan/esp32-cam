require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import services and routes
const { connectDatabase, disconnectDatabase } = require('./services/database');
const streamManager = require('./services/StreamManager');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');
const docsRoutes = require('./routes/docs');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust first proxy (nginx, Render, etc.) so express-rate-limit
// can correctly read client IP from X-Forwarded-For header
app.set('trust proxy', 1);

// Rate limiting (more permissive in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});

// Apply rate limiting to all requests (except in development)
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}

// More permissive rate limiting for API endpoints (ESP32 needs frequent uploads)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1200, // 1200 requests per minute for API (20 FPS * 60 seconds)
  skip: (req) => req.path.startsWith('/api/stream'), // Skip rate limiting for stream uploads
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.ADDRESS || 'https://your-domain.com'] 
    : [process.env.ADDRESS || 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: 'image/jpeg', limit: '5mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, '../client')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', docsRoutes);
app.use('/api', apiLimiter, apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    error: 'Page not found',
    code: 404 
  });
});

// Stream manager event listeners
streamManager.on('streamStarted', (deviceId) => {
  console.log(`📹 Stream started for device: ${deviceId}`);
});

streamManager.on('streamEnded', (deviceId) => {
  console.log(`📹 Stream ended for device: ${deviceId}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Close all active streams
  const stats = streamManager.getStats();
  console.log(`📊 Closing ${stats.activeStreams} active streams...`);
  
  // Disconnect database
  await disconnectDatabase();
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to database
    const dbConnected = await connectDatabase();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log stream manager stats every 30 seconds in development
      if (process.env.NODE_ENV !== 'production') {
        setInterval(() => {
          const stats = streamManager.getStats();
          if (stats.activeStreams > 0 || stats.totalViewers > 0) {
            console.log(`📊 Streams: ${stats.activeStreams}, Viewers: ${stats.totalViewers}`);
          }
        }, 30000);
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
