import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export function protectPage(requiredRole) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("../index.html");
      return;
    }

    try {
      const snapshot = await getDoc(doc(db, "users", user.uid));

      if (!snapshot.exists()) {
        await signOut(auth);
        window.location.replace("../index.html");
        return;
      }

      const profile = snapshot.data();

      if (
        profile.active !== true ||
        profile.role !== requiredRole
      ) {
        await signOut(auth);
        window.location.replace("../index.html");
        return;
      }

      window.currentUserProfile = {
        uid: user.uid,
        ...profile
      };

      document.dispatchEvent(
        new CustomEvent("sbx:user-ready", {
          detail: window.currentUserProfile
        })
      );
    } catch (error) {
      console.error("Page guard error:", error);
      window.location.replace("../index.html");
    }
  });
}
