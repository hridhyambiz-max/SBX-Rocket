import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");

async function redirectByRole(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("Firestore user profile nahi mila.");
  }

  const profile = snapshot.data();

  if (profile.active !== true) {
    await signOut(auth);
    throw new Error("Ye account inactive hai.");
  }

  sessionStorage.setItem("sbxUser", JSON.stringify({
    uid: user.uid,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    businessId: profile.businessId,
    employeeId: profile.employeeId || ""
  }));

  if (profile.role === "founder") {
    window.location.replace("./founder/index.html");
    return;
  }

  if (profile.role === "employee") {
    window.location.replace("./employee/index.html");
    return;
  }

  throw new Error("User role valid nahi hai.");
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await redirectByRole(credential.user);
  } catch (error) {
    console.error(error);
    loginError.textContent =
      "Email, password ya user profile check karo.";
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user || !loginForm) return;

  try {
    await redirectByRole(user);
  } catch (error) {
    loginError.textContent = error.message;
  }
});
