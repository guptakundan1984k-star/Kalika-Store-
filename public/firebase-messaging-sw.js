importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBTUWwoXsfQeABnvtDbo2PVOOwWeDclNbY",
  authDomain: "ai-studio-applet-webapp-146db.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-146db",
  storageBucket: "ai-studio-applet-webapp-146db.firebasestorage.app",
  messagingSenderId: "687576695878",
  appId: "1:687576695878:web:d751d62525219b27fab647"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
