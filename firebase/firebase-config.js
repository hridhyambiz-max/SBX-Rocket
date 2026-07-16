import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5DLTPkpHoJlnxeLbgiuqQU5yKAEfOP9o",
  authDomain: "sbx-rocket.firebaseapp.com",
  projectId: "sbx-rocket",
  storageBucket: "sbx-rocket.firebasestorage.app",
  messagingSenderId: "368970755024",
  appId: "1:368970755024:web:37d641b3eab6b0283ae7d5",
  measurementId: "G-0DSNE4SNJZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

export { app, auth, db };
