const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');
const { onValueCreated, onValueUpdated } = require('firebase-functions/v2/database');
const { logger } = require('firebase-functions');
const {
  isOrderReadyForDelivery,
  isPhoiHandoff,
} = require('./notificationConditions');

const databaseURL = 'https://quanlysanxuat-97d98-default-rtdb.firebaseio.com';
const databaseApp =
  getApps().find((app) => app.options.databaseURL) ||
  initializeApp({ databaseURL }, 'push-notifications');
const database = getDatabase(databaseApp);
const messaging = getMessaging(databaseApp);

const DATABASE_INSTANCE = 'quanlysanxuat-97d98-default-rtdb';
const MULTICAST_LIMIT = 500;
const DINH_HINH_EMAILS = new Set([
  'chaunho@gmail.com',
  'chaulon@gmail.com',
  'khongo@gmail.com',
  'admin@gmail.com',
  'haittpc08155@gmail.com',
]);
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

async function getRegistrations(recipientEmails) {
  const snapshot = await database.ref('fcmTokens').get();
  let allowedUids = null;
  if (recipientEmails) {
    const allowedEmails = new Set(
      [...recipientEmails].map((email) => email.toLowerCase()),
    );
    allowedUids = new Set();
    let pageToken;
    do {
      const page = await getAuth(databaseApp).listUsers(1000, pageToken);
      page.users.forEach((user) => {
        if (user.email && allowedEmails.has(user.email.toLowerCase())) {
          allowedUids.add(user.uid);
        }
      });
      pageToken = page.pageToken;
    } while (pageToken);
  }
  const registrations = [];

  Object.entries(snapshot.val() || {}).forEach(([uid, userTokens]) => {
    if (allowedUids && !allowedUids.has(uid)) return;
    Object.entries(userTokens || {}).forEach(([tokenKey, registration]) => {
      const token =
        typeof registration === 'string' ? registration : registration?.token;
      if (token) {
        registrations.push({ uid, tokenKey, token });
      }
    });
  });

  return registrations;
}

async function sendPush({ title, body, link = '/' }, recipientEmails) {
  const registrations = await getRegistrations(recipientEmails);
  let successCount = 0;
  let failureCount = 0;

  for (let start = 0; start < registrations.length; start += MULTICAST_LIMIT) {
    const batch = registrations.slice(start, start + MULTICAST_LIMIT);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map(({ token }) => token),
      data: { title, body, link },
      webpush: { headers: { Urgency: 'high' } },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    await Promise.all(
      response.responses.map((result, index) => {
        if (result.success || !INVALID_TOKEN_CODES.has(result.error?.code)) {
          return null;
        }
        const { uid, tokenKey } = batch[index];
        return database.ref(`fcmTokens/${uid}/${tokenKey}`).remove();
      }),
    );
  }

  logger.info('Push notification sent', {
    title,
    recipientCount: registrations.length,
    successCount,
    failureCount,
  });
}

exports.notifyAllOnOrderCreated = onValueCreated(
  {
    ref: '/orders/{orderId}',
    instance: DATABASE_INSTANCE,
    region: 'us-central1',
  },
  async (event) => {
    const order = event.data.val();
    await sendPush({
      title: 'Có đơn hàng mới',
      body: `Đơn ${order.maDon || order.tenSP || event.params.orderId} vừa được tạo.`,
    });
  },
);

exports.notifyTeamsOnOrderUpdated = onValueUpdated(
  {
    ref: '/orders/{orderId}',
    instance: DATABASE_INSTANCE,
    region: 'us-central1',
  },
  async (event) => {
    const beforeOrder = event.data.before.val();
    const afterOrder = event.data.after.val();
    if (!beforeOrder || !afterOrder) return;

    if (
      isPhoiHandoff(beforeOrder, afterOrder) &&
      afterOrder.daGiao !== true
    ) {
      await sendPush(
        {
          title: 'Tổ Phôi vừa bàn giao',
          body: `Đơn ${afterOrder.maDon || afterOrder.tenSP || event.params.orderId} có hàng chờ Tổ Định Hình nhận.`,
        },
        DINH_HINH_EMAILS,
      );
    }

    if (isOrderReadyForDelivery(beforeOrder, afterOrder)) {
      await sendPush({
        title: 'Đơn hàng xong, chờ giao',
        body: `Đơn ${afterOrder.maDon || afterOrder.tenSP || event.params.orderId} đã đóng gói đủ và đang chờ giao.`,
      });
    }
  },
);
