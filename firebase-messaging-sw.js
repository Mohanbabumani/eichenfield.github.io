// Import and initialize the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// ⚠️ PASTE THE SAME FIREBASE CONFIG FROM YOUR APP.JS HERE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyBkKZHomt-1eKhATVLjkgOrjLGmw-EpwWI",
  authDomain: "advisor-meeting.firebaseapp.com",
  databaseURL: "https://advisor-meeting-default-rtdb.firebaseio.com",
  projectId: "advisor-meeting",
  storageBucket: "advisor-meeting.firebasestorage.app",
  messagingSenderId: "198832931796",
  appId: "1:198832931796:web:ae205e1eddf4a4c2764c41"
};
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This will handle messages when the app is in the background
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // Optional: Add an icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
