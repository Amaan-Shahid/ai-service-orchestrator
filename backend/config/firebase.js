const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const configuredServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountPath = configuredServiceAccountPath
  ? path.resolve(configuredServiceAccountPath)
  : path.join(__dirname, "firebase-service-account.json");

if (!admin.apps.length) {
  const credential = fs.existsSync(serviceAccountPath)
    ? admin.credential.cert(require(serviceAccountPath))
    : admin.credential.applicationDefault();

  admin.initializeApp({
    credential,
  });
}

const db = admin.firestore();

module.exports = db;
