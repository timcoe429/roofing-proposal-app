import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import routes
import proposalRoutes from './routes/proposalRoutes.js';
import visionRoutes from './routes/visionRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import testRoutes from './routes/testRoutes.js';
import materialRoutes from './routes/materialRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { setupDatabase } from './config/database.js';
// import { runMigrations } from './utils/runMigrations.js';
// import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
console.log(`DEBUG: PORT environment variable: ${process.env.PORT}`);
console.log(`DEBUG: Using PORT: ${PORT}`);

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    /\.railway\.app$/,  // Allow Railway subdomains
    /localhost:\d+/     // Allow localhost with any port
  ],
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (for reset page)
app.use(express.static(path.join(__dirname, '../public')));

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
}

// Add request logging
app.use((req, res, next) => {
  console.log(`[Server] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/test', testRoutes);

// Test endpoint
app.post('/api/test-save', (req, res) => {
  console.log('[Test Save] Body:', req.body);
  res.json({ success: true, received: req.body });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Roofing Proposal API is running!'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Roofing Proposal App API',
    status: 'running',
    endpoints: ['/api/health', '/api/proposals', '/api/vision', '/api/auth']
  });
});

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Environment validation for Railway
const validateEnvironment = () => {
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`WARNING: Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('INFO: Environment check completed');
  console.log(`INFO: NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`INFO: DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  console.log(`INFO: PORT: ${process.env.PORT || 'Not set (using default)'}`);
};

// Initialize database and start server
const startServer = async () => {
  try {
    validateEnvironment();
    
    await setupDatabase();
    console.log('INFO: Database connected successfully');
    
    // TODO: Run migrations
    // await runMigrations();
    // console.log('INFO: Database migrations completed');
    
    // In production, bind to 0.0.0.0 for external access (Railway/Cloudflare)
    // In development, bind to localhost for local proxy
    const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    app.listen(PORT, HOST, () => {
      console.log(`INFO: Server running on port ${PORT}`);
      console.log(`INFO: Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`INFO: Server bound to ${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('ERROR: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
