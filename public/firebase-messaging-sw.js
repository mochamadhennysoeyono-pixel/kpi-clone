// public/firebase-messaging-sw.js
// MOD: This file has been completely rewritten to be robust.

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with the same config
// This config is safe to be public.
const firebaseConfig = {
  apiKey: "AIzaSy...", // This will be auto-filled by Firebase if configured, but isn't strictly necessary for messaging background handling.
  authDomain: "kpi-dev-vjyoo.firebaseapp.com",
  projectId: "kpi-dev-vjyoo",
  storageBucket: "kpi-dev-vjyoo.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "526266144523",
  appId: "1:526266144523:web:bec56868ae65959199f40e"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
// MOD: Added the onBackgroundMessage handler to actually show notifications.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Notifikasi Baru';
  const notificationOptions = {
    body: payload.notification?.body || 'Anda memiliki pesan baru.',
    icon: payload.notification?.icon || '/logo-192.png', // A default icon in your public folder
    badge: '/logo-badge.png', // A badge icon
    data: { 
        url: payload.data?.link || '/' 
    } // Pass link from data payload
  };

  // Use the service worker's registration to show the notification.
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        // If so, just focus it.
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
