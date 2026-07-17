import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { claimEmployeeInvite } from './invite-service.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const errorEl = document.getElementById('loginError');
const button = loginForm?.querySelector('button[type="submit"]');
let redirecting = false;

function showError(message = '') { if (errorEl) errorEl.textContent = message; }
function showSignupError(message = '') { const el = document.getElementById('signupError'); if (el) el.textContent = message; }
function setMode(mode) {
  document.body.dataset.authMode = mode;
  loginForm?.closest('.auth-panel')?.classList.toggle('hidden', mode !== 'login');
  signupForm?.closest('.auth-panel')?.classList.toggle('hidden', mode !== 'signup');
}

async function getProfile(user) {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) throw new Error('Your user profile was not found.');
  const profile = snap.data();
  if (profile.active !== true) throw new Error('This account is inactive. Contact your founder.');
  if (!['founder', 'employee'].includes(profile.role)) throw new Error('This account does not have a valid workspace role.');
  return profile;
}

async function redirectByRole(user) {
  if (redirecting) return;
  redirecting = true;
  try {
    const profile = await getProfile(user);
    const session = { uid:user.uid, email:user.email, name:profile.name||user.email, role:profile.role, businessId:profile.businessId||'sandbox-media', employeeId:profile.employeeId||'', department:profile.department||'', designation:profile.designation||'' };
    localStorage.setItem('sbx_session', JSON.stringify(session));
    sessionStorage.setItem('sbxUser', JSON.stringify(session));
    location.replace(profile.role === 'founder' ? './founder/index.html' : './employee/index.html');
  } finally { redirecting = false; }
}

loginForm?.addEventListener('submit', async event => {
  event.preventDefault(); showError();
  const email = emailEl?.value.trim() || '';
  const password = passwordEl?.value || '';
  if (!email || !password) return showError('Enter your email and password.');
  try {
    if (button) { button.disabled = true; button.textContent = 'Signing in…'; }
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await redirectByRole(credential.user);
  } catch (error) {
    console.error(error);
    const map = {
      'auth/invalid-credential':'Incorrect email or password.',
      'auth/user-disabled':'This account has been disabled.',
      'auth/too-many-requests':'Too many attempts. Please try again later.',
      'auth/network-request-failed':'Check your internet connection.'
    };
    showError(map[error.code] || error.message || 'Sign in failed.');
  } finally { if (button) { button.disabled = false; button.textContent = 'Sign in'; } }
});

signupForm?.addEventListener('submit', async event => {
  event.preventDefault(); showSignupError();
  const submit = signupForm.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(signupForm));
  try {
    submit.disabled = true; submit.textContent = 'Creating account…';
    const user = await claimEmployeeInvite(data);
    await redirectByRole(user);
  } catch (error) {
    console.error(error);
    const map = {
      'auth/email-already-in-use':'An account already exists for this email. Use Sign in or reset your password.',
      'auth/invalid-email':'Enter a valid email address.',
      'auth/weak-password':'Choose a stronger password with at least 6 characters.',
      'permission-denied':'This invitation could not be verified.'
    };
    showSignupError(map[error.code] || error.message || 'Account setup failed.');
  } finally { submit.disabled = false; submit.textContent = 'Create employee account'; }
});

document.getElementById('showSignup')?.addEventListener('click', () => setMode('signup'));
document.getElementById('showLogin')?.addEventListener('click', () => setMode('login'));

onAuthStateChanged(auth, async user => {
  if (!user || (!loginForm && !signupForm)) return;
  try { await redirectByRole(user); }
  catch (error) { console.error(error); await signOut(auth); showError(error.message); }
});
