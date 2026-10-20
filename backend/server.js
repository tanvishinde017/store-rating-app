// Load environment variables before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const storesRoutes = require('./routes/stores.routes');
const ratingsRoutes = require('./routes/ratings.routes');
const adminRoutes = require('./routes/admin.routes');
const ownerRoutes = require('./routes/owner.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// CORS - allows requests from the Vite dev server during local development.
// Restrict the origins list in production.
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'store-rating-api' });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/stores', storesRoutes);
// Ratings endpoints live under /api/stores/:id/ratings
app.use('/api/stores', ratingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function start() {
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to the database. Check your .env settings.');
    process.exit(1);
  }
  app.listen(port, () => {
    console.log(`Store Rating API listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
