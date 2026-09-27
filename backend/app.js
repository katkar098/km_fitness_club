require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth.routes');
const gymRoutes = require('./src/routes/gym.routes');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header
      // (Postman, server-to-server, health checks, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error('Origin not allowed by CORS')
      );
    },

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ]
  })
);

/*
|--------------------------------------------------------------------------
| Body Parser
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '1mb'
  })
);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use('/api/auth', authRoutes);

app.use('/api/payments', paymentRoutes);

app.use('/api', gymRoutes);

/*
|--------------------------------------------------------------------------
| Serve React Frontend
|--------------------------------------------------------------------------
|
| frontend/dist is created during Render build:
|
| npm run build --prefix frontend
|
*/

const frontendPath = path.join(
  __dirname,
  '..',
  'frontend',
  'build'
);

app.use(
  express.static(frontendPath)
);

/*
|--------------------------------------------------------------------------
| React SPA Fallback
|--------------------------------------------------------------------------
|
| Any non-API route should return React's index.html.
|
*/

app.get(
  /^\/(?!api(?:\/|$)|health(?:\/|$)).*/,
  (req, res) => {
    res.sendFile(
      path.join(frontendPath, 'index.html')
    );
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

module.exports = app;