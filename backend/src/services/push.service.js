const prisma = require("../config/db");
const { getMessaging, USE_FIREBASE } = require("../config/firebase");

// Sends a push notification to every device registered to a user. Silently
// does nothing if Firebase isn't configured, and cleans up any tokens
// Firebase reports as no-longer-valid (uninstalled app, expired web token).
async function sendPushToUser(userId, { title, body, data = {} }) {
  if (!USE_FIREBASE) return;
  const messaging = getMessaging();
  if (!messaging) return;

  const devices = await prisma.deviceToken.findMany({ where: { userId } });
  if (devices.length === 0) return;

  const results = await Promise.allSettled(
    devices.map((d) =>
      messaging.send({
        token: d.token,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      })
    )
  );

  const staleTokenIds = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const code = result.reason?.errorInfo?.code || result.reason?.code;
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        staleTokenIds.push(devices[i].id);
      } else {
        console.error("Push send failed:", result.reason?.message || result.reason);
      }
    }
  });

  if (staleTokenIds.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: staleTokenIds } } });
  }
}

module.exports = { sendPushToUser };
