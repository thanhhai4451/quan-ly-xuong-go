const { getApps, initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');

if (getApps().length === 0) {
  initializeApp();
}

const MULTICAST_LIMIT = 500;
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

async function sendPushNotificationToUser(userId, { title, body, data = {} }) {
  if (!userId || !title || !body) {
    throw new Error('userId, title và body là các trường bắt buộc.');
  }

  const snapshot = await getDatabase().ref(`fcmTokens/${userId}`).get();
  const registrations = Object.entries(snapshot.val() || {}).filter(
    ([, registration]) => registration?.token,
  );
  if (registrations.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const messageData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)]),
  );
  let successCount = 0;
  let failureCount = 0;

  for (let start = 0; start < registrations.length; start += MULTICAST_LIMIT) {
    const batch = registrations.slice(start, start + MULTICAST_LIMIT);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map(([, registration]) => registration.token),
      notification: { title, body },
      data: messageData,
      webpush: {
        notification: { icon: '/logo192.png' },
      },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    const staleTokenRemovals = response.responses
      .map((result, index) => {
        if (!result.success && INVALID_TOKEN_CODES.has(result.error?.code)) {
          return getDatabase()
            .ref(`fcmTokens/${userId}/${batch[index][0]}`)
            .remove();
        }
        return null;
      })
      .filter(Boolean);

    await Promise.all(staleTokenRemovals);
  }

  return { successCount, failureCount };
}

module.exports = { sendPushNotificationToUser };
