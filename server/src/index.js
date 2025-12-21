require('dotenv').config();

const express = require('express');
const cors = require('cors');

const busRoutes = require('./routes/busRoutes');
const { admin } = require('./config/firebaseAdmin');

const app = express();

app.use(express.json());
app.use(cors());
app.use(busRoutes);

const messaging = admin.messaging();

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Bus tracking backend is running' });
});

app.post('/send-notification', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields: token, title, body' });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      token,
    };

    const response = await messaging.send(message);
    console.log('✅ Notification sent:', response);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  const status = error.status || 500;
  res.status(status).json({ error: error.message || 'Internal server error' });
});

const DEFAULT_PORT = 4000;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}`);
  console.log(`📬 FCM endpoint: POST http://localhost:${PORT}/send-notification`);
});
