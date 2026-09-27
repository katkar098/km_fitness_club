require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth.routes');
const gymRoutes = require('./src/routes/gym.routes');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',').map((origin) => origin.trim());
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed by CORS')); }, methods: ['GET','POST','PUT','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', gymRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
