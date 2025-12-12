const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

const busRoutes = require('./routes/busRoutes');

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });
dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(busRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error from notification server:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚍 Notification server listening on port ${PORT}`);
});
