import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const form = document.getElementById("loginForm");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const errorEl = document.getElementById("loginError");
const button = form?.querySelector('button[type="submit"]');
let redirecting = false;

function showError(message="") { if (errorEl) errorEl.textContent = message; }

async function getProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) throw new Error("Firestore me is account ka users/{UID} profile nahi mila.");
  const profile = snap.data();
  if (profile.active !== true) throw new Error("Ye account inactive hai.");
  if (!["founder", "employee"].includes(profile.role)) throw new Error("User role founder ya employee hona chahiye.");
  return profile;
}

async function redirectByRole(user) {
  if (redirecting) return;
  redirecting = true;
  try {
    const profile = await getProfile(user);
    const session = { uid:user.uid, email:user.email, name:profile.name||user.email, role:profile.role, businessId:profile.businessId||"sandbox-media", employeeId:profile.employeeId||"", department:profile.department||"", designation:profile.designation||"" };
    localStorage.setItem("sbx_session", JSON.stringify(session));
    sessionStorage.setItem("sbxUser", JSON.stringify(session));
    location.replace(profile.role === "founder" ? "./founder/index.html" : "./employee/index.html");
  } finally { redirecting = false; }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault(); showError();
  const email = emailEl?.value.trim() || "";
  const password = passwordEl?.value || "";
  if (!email || !password) return showError("Email aur password enter karo.");
  try {
    if (button) { button.disabled=true; button.textContent="Signing in…"; }
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await redirectByRole(credential.user);
  } catch (error) {
    console.error(error);
    const map = {
      "auth/invalid-credential":"Email ya password galat hai.",
      "auth/user-disabled":"Ye account disabled hai.",
      "auth/too-many-requests":"Bahut attempts hue. Thodi der baad try karo.",
      "auth/network-request-failed":"Internet connection check karo."
    };
    showError(map[error.code] || error.message || "Login nahi ho saka.");
  } finally { if (button) { button.disabled=false; button.textContent="Sign in"; } }
});

onAuthStateChanged(auth, async user => {
  if (!user || !form) return;
  try { await redirectByRole(user); }
  catch (error) { console.error(error); await signOut(auth); showError(error.message); }
});
