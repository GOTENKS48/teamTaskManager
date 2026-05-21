const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { PrismaClient } = require('@prisma/client');
const errorHandler = require('./middleware/errorHandler');

// ─── Route Imports ───────────────────────────────────────────────────────────

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const memberRoutes = require('./routes/members');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');

// ─── Initialize ──────────────────────────────────────────────────────────────

const app = express();
const prisma = new PrismaClient();

// Make prisma available to routes
app.locals.prisma = prisma;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ──────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.use('/api/auth', authRoutes);

// Projects
app.use('/api/projects', projectRoutes);

// Members (nested under projects)
app.use('/api/projects/:id/members', memberRoutes);

// Tasks (nested under projects)
app.use('/api/projects/:id/tasks', taskRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// ─── Fallback & Error Handling ───────────────────────────────────────────────

// 404 for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Serve frontend for all non-API routes (SPA-style fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────

async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();

module.exports = app;
