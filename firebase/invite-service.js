import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const normalEmail = value => String(value || '').trim().toLowerCase();

export async function claimEmployeeInvite({ email, password, confirmPassword }) {
  const cleanEmail = normalEmail(email);
  if (!cleanEmail) throw new Error('Enter your invited email address.');
  if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters.');
  if (password !== confirmPassword) throw new Error('Passwords do not match.');

  const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const user = credential.user;
  try {
    const inviteRef = doc(db, 'invitations', cleanEmail);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error('No active employee invitation was found for this email.');
    const invite = inviteSnap.data();
    if (invite.status !== 'pending') throw new Error('This invitation is no longer active.');

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: invite.name || cleanEmail,
      email: cleanEmail,
      employeeId: invite.employeeId || user.uid,
      phone: invite.phone || '',
      role: 'employee',
      designation: invite.designation || invite.roleTitle || 'Employee',
      department: invite.department || 'Unassigned',
      businessId: invite.businessId || 'sandbox-media',
      businessName: invite.businessName || 'Sandbox Media',
      active: true,
      accountStatus: 'active',
      invitedBy: invite.createdBy || '',
      createdAt: serverTimestamp()
    });

    await updateDoc(inviteRef, {
      status: 'claimed',
      claimedBy: user.uid,
      claimedAt: serverTimestamp()
    });
    return user;
  } catch (error) {
    try { await deleteUser(user); } catch {}
    throw error;
  }
}

export async function cancelSignupSession() {
  await signOut(auth);
}
