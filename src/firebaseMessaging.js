import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { app, db } from './firebase';

const VAPID_KEY =
  process.env.REACT_APP_FIREBASE_VAPID_KEY ||
  'BADmcbA3s2F039ypNX9YIZ7Oiqe0FT6ST_wVUdm9ceaSGd5j64IT8-jzC06pdmYcPSMfJayBX879tpf5t9_k3ng';

export async function registerMessagingServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

export async function requestPushPermission(userId) {
  if (!userId) {
    throw new Error('Cần đăng nhập để bật thông báo trên thiết bị này.');
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Trình duyệt này không hỗ trợ thông báo đẩy.');
  }
  if (!(await isSupported())) {
    throw new Error('Firebase Cloud Messaging không được hỗ trợ trên trình duyệt này.');
  }
  if (!VAPID_KEY) {
    throw new Error('Chưa cấu hình REACT_APP_FIREBASE_VAPID_KEY.');
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Bạn chưa cấp quyền gửi thông báo.');
  }

  const serviceWorkerRegistration = await registerMessagingServiceWorker();
  if (!serviceWorkerRegistration) {
    throw new Error('Trình duyệt không thể đăng ký service worker.');
  }

  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration,
  });
  if (!token) {
    throw new Error('Không lấy được FCM token cho thiết bị này.');
  }

  const tokenKey = btoa(token)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  await set(ref(db, `fcmTokens/${userId}/${tokenKey}`), {
    token,
    updatedAt: Date.now(),
  });

  return token;
}

export async function listenForForegroundMessages(callback) {
  if (!(await isSupported())) {
    return () => {};
  }

  return onMessage(getMessaging(app), callback);
}
