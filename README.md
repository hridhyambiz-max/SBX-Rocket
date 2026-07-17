# SBX Rocket — Free Employee Invite Setup

1. Upload all files to GitHub Pages.
2. In Firebase Console, open Firestore Database → Rules.
3. Replace the existing rules with the contents of `firestore.rules`, then click Publish.
4. Founder signs in and opens Employees / Team & Roles → Invite Employee.
5. Founder enters the employee's exact email and saves the invitation.
6. Employee opens the normal login page and clicks **First time employee? Create your account**.
7. Employee uses the same invited email and creates a password.

This flow works on the Firebase Spark plan. No Cloud Functions or billing account is required.
