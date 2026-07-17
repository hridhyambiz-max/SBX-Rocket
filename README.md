# SBX Rocket – Employee ID + PIN Build

Founder signs in with Firebase email/password. Employees sign in with Employee ID + PIN created from Founder → Team & Roles.

Firebase setup required:
1. Authentication → Sign-in method → enable **Anonymous** (used silently for employee sessions).
2. Firestore Database → Rules → paste `firestore.rules` and Publish.
3. Keep Email/Password enabled for the Founder account.

No Cloud Functions, invitation flow, employee email signup, or Blaze billing is required.
