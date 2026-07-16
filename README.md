# SBX Rocket Founder + Employee Portal v49

Open `index.html` first.

Demo logins:
- Founder: founder@sbxrocket.com / founder123
- Employee: PRIYA001 / employee123

Structure:
- `/founder/index.html` existing Founder Operations OS
- `/employee/index.html` separate Employee Portal
- Root `/index.html` role-based local demo login

Firebase can later replace the local login/session without changing the separate founder/employee page structure.


## v50 fixes
- Business card dropdown is now a working business switcher.
- Founder profile menu actions work.
- Added working logout.
- Profile editor and Company Settings routing added.
- Theme preference persists.


## v62 Attendance Record Tracking
- Check-in timestamp persists after refresh/reopen.
- Live worked and break timers update every second.
- Break start/end is included in total break time.
- Check-out creates a dated attendance record.
- Monthly summary, 7-day chart and recent records are calculated from saved attendance data.


## v63 Leave Date Range
- From and To date leave requests
- Inclusive leave-day calculation
- Date validation and live duration
- Leave balance and request history cards
