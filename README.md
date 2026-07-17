# SBX Rocket — Firebase Connected

## Deploy
Upload the repository contents to GitHub Pages. Open the site through HTTPS, not `file:///`.

## Firebase Console requirements
1. Authentication: Email/Password enabled.
2. Firestore: `users/{AUTH_UID}` documents with `role` (`founder` or `employee`), `active: true`, and matching profile fields.
3. Publish the rules from `firestore.rules`.
4. Authentication → Settings → Authorized domains: add `hridhyambiz-max.github.io`.

## Data connected
- Firebase Authentication and role redirect
- Founder/employee page protection and logout
- Tasks and task status updates
- Attendance records
- Leave requests and founder approval status
- Employee notifications (read)
- Payslips (read)
- Reward redemption requests

Cloud Storage is optional and is not required for the core app.
