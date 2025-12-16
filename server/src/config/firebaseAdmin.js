const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_ENV = 'FIREBASE_SERVICE_ACCOUNT_PATH';

function resolveServiceAccountPath() {
	const customPath = process.env[SERVICE_ACCOUNT_ENV];
	if (customPath) {
		const absolute = path.resolve(customPath);
		if (!fs.existsSync(absolute)) {
			throw new Error(`Service account file not found at ${absolute}.`);
		}
		return absolute;
	}

	const fallback = path.resolve(__dirname, '..', '..', 'serviceAccountKey.json');
	if (!fs.existsSync(fallback)) {
		throw new Error(
			`serviceAccountKey.json missing. Set ${SERVICE_ACCOUNT_ENV} or place the file at ${fallback}.`
		);
	}
	return fallback;
}

function loadServiceAccount() {
	const filePath = resolveServiceAccountPath();
	const raw = fs.readFileSync(filePath, 'utf8');
	try {
		return JSON.parse(raw);
	} catch (error) {
		throw new Error(`Unable to parse service account JSON at ${filePath}: ${error.message}`);
	}
}

function initializeAdmin() {
	if (admin.apps.length > 0) {
		return admin;
	}

	const credentials = loadServiceAccount();
	admin.initializeApp({
		credential: admin.credential.cert(credentials),
		projectId: credentials.project_id,
	});

	return admin;
}

const firebaseAdmin = initializeAdmin();
const firestore = firebaseAdmin.firestore();

module.exports = {
	admin: firebaseAdmin,
	db: firestore,
};
