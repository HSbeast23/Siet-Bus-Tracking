const express = require('express');
const { sendBusStartNotification, sendDirectNotification } = require('../services/notificationService');

const router = express.Router();

router.post('/startBus', async (req, res, next) => {
  try {
    const { busNumber, driverName, initiatedBy, excludeToken } = req.body || {};

    if (!busNumber) {
      return res.status(400).json({ error: 'busNumber is required' });
    }

    const result = await sendBusStartNotification(busNumber, {
      driverName,
      initiatedBy,
      excludeToken,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/notify', async (req, res, next) => {
  try {
    const { recipientUid, title, body, data } = req.body || {};

    if (!recipientUid) {
      return res.status(400).json({ error: 'recipientUid is required' });
    }

    const result = await sendDirectNotification(recipientUid, { title, body, data });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
