require('dotenv').config();

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}

const db = admin.firestore();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}`);
  console.log(`📬 FCM endpoint: POST http://localhost:${PORT}/send-notification`);
});
