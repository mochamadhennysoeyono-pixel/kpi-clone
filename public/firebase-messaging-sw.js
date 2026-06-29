
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Config should match your client config
firebase.initializeApp({
  apiKey: "AIzaSy...", // Will be filled by Firebase during build/runtime if using full SDK, but here we just need basic init
  authDomain: "kpi-dev-vjyoo.firebaseapp.com",
  projectId: "kpi-dev-vjyoo",
  storageBucket: "kpi-dev-vjyoo.firebasestorage.app",
  messagingSenderId: "526266144523",
  appId: "1:526266144523:web:bec56868ae65959199f40e"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp',
    badge: 'https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp',
    data: {
        url: payload.data?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
