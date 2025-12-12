const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function resolveServiceAccount() {
  const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidate = customPath
    ? path.resolve(customPath)
    : path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');

  if (!fs.existsSync(candidate)) {
    throw new Error(`serviceAccountKey.json not found at ${candidate}. Set FIREBASE_SERVICE_ACCOUNT_PATH environment variable.`);
  }

  const raw = fs.readFileSync(candidate, 'utf8');
  return JSON.parse(raw);
}

function initializeAdmin() {
  if (admin.apps.length) {
    return admin;
  }

  const serviceAccount = resolveServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return admin;
}

const firebaseAdmin = initializeAdmin();
const firestore = firebaseAdmin.firestore();

module.exports = {
  admin: firebaseAdmin,
  db: firestore,
};
