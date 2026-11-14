# Driver pages (Member 3)

Front-end for everything a driver does in UniRide. All files are in `src/driver/`. The screens follow the Figma file (frames WF-30 to WF-41) and the validation rules come from Milestone 3 (FR-D2 to FR-D8).

## Pages

| Route | File | Figma | What it does |
|---|---|---|---|
| `/driver` | `DriverDashboard.js` | WF-30, 30a, 30D | Balance, trips awaiting completion, upcoming trips with request badges. Shows "Register a vehicle" when the user has no approved car. Two columns on desktop. |
| `/driver/trips` | `MyTrips.js` | WF-31, 31a, 31b | Tabs Upcoming / Awaiting / Past. Recurring trips are grouped under their series. Past trips show what happened to the credits. |
| `/driver/post` | `PostTrip.js` | WF-32, 32a, 32b, 32D | Post one trip. Checks origin ≠ destination, future time, seats 1 to car capacity, and no other trip within 60 minutes. Desktop shows a live rider preview. |
| `/driver/trips/:tripId` | `ManageTrip.js` | WF-33, 33a, 34, 34a–d, 35, 37 | Requests (accept, decline with a reason, waitlist when full), Passengers (profile and message only, no phone or email), Details (edit, cancel with a confirmation dialog). Only the trip's own driver can open it. |
| `/driver/trips/:tripId/edit` | `EditTrip.js` | WF-36, 36a, 36b | Edit before departure. Seats can't go below accepted riders. Accepted riders are told exactly what changed. |
| `/driver/trips/:tripId/complete` | `CompleteTrip.js` | WF-40, 40a, 40b | After departure, within 48 hours: untick no-shows, earn 1 credit per rider who travelled. After 48 hours the trip expires. |
| `/driver/trips/:tripId/rate` | `RateRiders.js` | WF-41, 41a, 41b, 41c | 1–5 stars and an optional review (≤ 300 characters) for each rider who travelled, within 7 days. |
| `/driver/schedule` | `MySchedule.js` | WF-38, 38a–38f | Enter classes by hand or import an `.ics` / `.csv` file (< 2 MB). Unreadable rows are listed and highlighted. Nothing is saved before the preview. |
| `/driver/recurring` | `RecurringTrips.js` | WF-39, 39a, 39b | One morning trip (45 min before the first class) and one return trip (15 min after the last class) per class day, until the end of the term. Blocks publishing while a trip clashes. |

## Shared files in this folder

- `driverUtils.js`: date formatting, trip state (open → awaiting → expired after 48 h), credits, notifications, 60-minute clash check.
- `DriverUI.js`: top bar, toast, pills, avatar, banners, field errors.
- `DriverGuard.js`: sign-in / no-vehicle screen, "no access" and "trip not found" screens.
- `TripForm.js`: the trip form and its checks, used by Post a trip and Edit trip.
- `Driver.css`: shared driver styles. Each page also has its own `.css` file. All class names start with `driver-`.

## How to try it

1. `npm install`, then `npm start`.
2. Sign in as the sample driver `ahmed.a@kfupm.edu.sa` (user `u2`, password in `src/shared/data.js`).
3. Open **Drive** in the top menu.

`driverUtils.js` adds one sample trip that departed 3 hours ago (`td1`), so "Mark as completed" and "Rate riders" can be tried. Refreshing the browser resets all sample data.

## Data written

Following the team plan, these pages only add fields and never rename them:

- `trips`: new trips, `status`, `seatsLeft`, plus `seriesId` (recurring), `completedAt` and `lastChange`.
- `bookings`: `status` (`accepted`, `declined`, `cancelled`, `completed`, `no_show`), plus `declineReason` and `cancelledBy`.
- `credits`: `earned` for the driver, `spent` for riders when a trip is completed.
- `ratings`, `notifications` and the user's `schedule`.
