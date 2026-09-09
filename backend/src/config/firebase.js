// Lazily initialized so the app doesn't crash on boot if Firebase credentials
// aren't set yet — matches the Cloudinary/Twilio fallback pattern used
// elsewhere in this project.
const USE_FIREBASE = Boolean(
  process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
);

if (!USE_FIREBASE) {
  console.warn(
    "[push] FIREBASE_* env vars not set — push notifications are disabled. " +
    "In-app notifications and chat still work by polling; devices just won't " +
    "get a real push/SMS-style alert when the app is closed. " +
    "See PRODUCTION_READY_GUIDE.md section on Firebase setup."
  );
}

let messaging = null;

function getMessaging() {
  if (!USE_FIREBASE) return null;
  if (messaging) return messaging;

  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Railway/Render env vars can't hold real newlines, so the private key
        // is stored with literal "\n" sequences and un-escaped here.
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  messaging = admin.messaging();
  return messaging;
}

module.exports = { getMessaging, USE_FIREBASE };
