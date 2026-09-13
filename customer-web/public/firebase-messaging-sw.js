// Firebase Cloud Messaging service worker — handles push notifications when
// the site isn't open/focused in a tab. This file is served as a static
// asset, so it can't read Next.js's process.env like the rest of the app —
// paste your actual Firebase config values below directly.
//
// Get these from Firebase Console > Project Settings > General > Your apps
// (the same values used for NEXT_PUBLIC_FIREBASE_* in .env.local).

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Godelicious", {
    body: body || "",
    icon: "/logo.svg",
  });
});
