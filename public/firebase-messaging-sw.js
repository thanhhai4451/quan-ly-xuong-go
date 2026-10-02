importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBjiVncPDevZ9_1saZwANE4M3ITkGjB0TY',
  authDomain: 'quanlysanxuat-97d98.firebaseapp.com',
  projectId: 'quanlysanxuat-97d98',
  storageBucket: 'quanlysanxuat-97d98.firebasestorage.app',
  messagingSenderId: '773840018886',
  appId: '1:773840018886:web:1c69bfda0250389f1f26c7',
  databaseURL: 'https://quanlysanxuat-97d98-default-rtdb.firebaseio.com',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title || payload.data?.title || 'Thông báo mới';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    data: {
      url: payload.fcmOptions?.link || payload.data?.link || '/',
    },
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => {
        const clientUrl = new URL(client.url);
        return clientUrl.origin === targetUrl.origin;
      });

      if (matchingClient) {
        return matchingClient
          .navigate(targetUrl.href)
          .then((client) => (client || matchingClient).focus());
      }

      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
