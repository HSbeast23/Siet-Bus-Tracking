const { admin } = require('../config/firebaseAdmin');
const {
  getRecipientsByBus,
  getRecipientsByRole,
  getTokensForUser,
  removeTokens,
} = require('../repositories/tokenRepository');

function buildMessagePayload({ busNumber, driverName }) {
  const title = `Bus ${busNumber} is now live`;
  const body = `${driverName || 'Driver'} started tracking. Check the live map for updates.`;

  return {
    notification: { title, body },
    data: {
      type: 'BUS_START',
      busNumber: String(busNumber),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'tracking-alerts',
        sound: 'default',
        color: '#1D4ED8',
      },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          category: 'tracking-alerts',
          sound: 'default',
        },
      },
    },
  };
}

async function buildRecipientList(busNumber, initiatedBy, excludeToken) {
  const recipients = await getRecipientsByBus(busNumber);
  const managementRecipients = await getRecipientsByRole('management');
  const combined = [...recipients, ...managementRecipients];
  if (!combined.length) {
    return [];
  }

  const excludedTokens = new Set();

  if (initiatedBy) {
    const initiatorTokens = await getTokensForUser(initiatedBy);
    initiatorTokens.forEach((token) => excludedTokens.add(token));
  }

  if (excludeToken) {
    excludedTokens.add(excludeToken);
  }

  const deduped = [];
  const seen = new Set();

  combined.forEach((recipient) => {
    recipient.tokens.forEach((token) => {
      if (!token || excludedTokens.has(token) || seen.has(token)) {
        return;
      }
      seen.add(token);
      deduped.push({ uid: recipient.uid, token });
    });
  });

  return deduped;
}

async function pruneInvalidTokens(failures, recipients) {
  if (!failures.length) {
    return;
  }

  const tokensByUser = new Map();

  failures.forEach((failureIndex) => {
    const { uid, token } = recipients[failureIndex];
    if (!tokensByUser.has(uid)) {
      tokensByUser.set(uid, new Set());
    }
    tokensByUser.get(uid).add(token);
  });

  const removalTasks = Array.from(tokensByUser.entries()).map(([uid, tokens]) =>
    removeTokens(uid, Array.from(tokens))
  );

  await Promise.all(removalTasks);
}

async function sendBusStartNotification(busNumber, { driverName, initiatedBy, excludeToken } = {}) {
  const recipients = await buildRecipientList(busNumber, initiatedBy, excludeToken);

  if (!recipients.length) {
    return {
      success: true,
      sentCount: 0,
      failureCount: 0,
      recipients: [],
      message: 'No FCM tokens registered for this bus.',
    };
  }

  const payload = buildMessagePayload({ busNumber, driverName });
  const tokens = recipients.map((recipient) => recipient.token);

  const response = await admin.messaging().sendEachForMulticast({
    ...payload,
    tokens,
  });

  console.info(
    `FCM multicast -> bus ${busNumber} | tokens=${tokens.length} | success=${response.successCount} | failure=${response.failureCount}`
  );

  const invalidIndexes = response.responses
    .map((item, index) => (item.success ? null : index))
    .filter((index) => index !== null && index !== undefined);

  const notRegisteredIndexes = response.responses
    .map((item, index) =>
      item.success || !item.error || item.error.code !== 'messaging/registration-token-not-registered'
        ? null
        : index
    )
    .filter((index) => index !== null && index !== undefined);

  if (notRegisteredIndexes.length) {
    await pruneInvalidTokens(notRegisteredIndexes, recipients);
  }

  return {
    success: true,
    sentCount: response.successCount,
    failureCount: response.failureCount,
    recipients: recipients.map((recipient) => recipient.uid),
    invalidTokens: invalidIndexes.map((index) => recipients[index]?.token).filter(Boolean),
  };
}

async function sendDirectNotification(recipientUid, { title, body, data } = {}) {
  if (!recipientUid) {
    throw new Error('recipientUid is required');
  }

  const tokens = await getTokensForUser(recipientUid);
  if (!tokens.length) {
    return {
      success: true,
      sentCount: 0,
      failureCount: 0,
      recipients: [],
    };
  }

  const response = await admin.messaging().sendEachForMulticast({
    notification: {
      title: title || 'SIET Bus Update',
      body: body || '',
    },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: 'tracking-alerts',
        sound: 'default',
      },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    tokens,
  });

  console.info(
    `FCM direct -> uid=${recipientUid} | tokens=${tokens.length} | success=${response.successCount} | failure=${response.failureCount}`
  );

  const notRegisteredIndexes = response.responses
    .map((item, index) =>
      item.success || !item.error || item.error.code !== 'messaging/registration-token-not-registered'
        ? null
        : index
    )
    .filter((index) => index !== null && index !== undefined);

  if (notRegisteredIndexes.length) {
    const syntheticRecipients = tokens.map((token) => ({ uid: recipientUid, token }));
    await pruneInvalidTokens(notRegisteredIndexes, syntheticRecipients);
  }

  return {
    success: true,
    sentCount: response.successCount,
    failureCount: response.failureCount,
    recipients: [recipientUid],
  };
}

module.exports = {
  sendBusStartNotification,
  sendDirectNotification,
};
