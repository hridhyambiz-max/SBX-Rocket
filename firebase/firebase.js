import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
