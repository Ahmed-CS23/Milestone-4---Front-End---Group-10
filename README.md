# UniRide

Ride-sharing for the KFUPM community using ride credits instead of money. Drivers post trips between campus and nearby areas, riders request seats, and each completed ride moves one credit from the rider to the driver. Administrators verify vehicles and handle reports.

SWE 363, Term 261, Group 10 — Milestone 4 front-end prototype, built with React.

Figma reference: https://www.figma.com/proto/LeH2fHKTJn8vSuiLRa2ySG/UniRide?page-id=0%3A1&node-id=8-962&starting-point-node-id=8%3A962

## Setup and installation

Requires [Node.js](https://nodejs.org) (version 18 or newer) and Git.

```bash
git clone https://github.com/Ahmed-CS23/Milestone-4---Front-End---Group-10.git
cd Milestone-4---Front-End---Group-10
npm install
npm start
```

`npm start` runs Parcel and opens the app at http://localhost:1234.

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd install` and `npm.cmd start` instead.

No API keys or environment variables are needed.

## Usage

### Demo accounts

All user passwords are `password123`.

| Email | Account |
|---|---|
| `ahmed.a@kfupm.edu.sa` | Driver with an approved vehicle and posted trips |
| `faisal.a@kfupm.edu.sa` | Rider with a pending request and a completed ride |
| `majed.o@kfupm.edu.sa` | Rider with an accepted seat |
| `yasser.h@kfupm.edu.sa` | Driver whose vehicle is waiting for review |
| `nawaf.h@kfupm.edu.sa` | Account whose email is not verified |
| `rayan.f@kfupm.edu.sa` | Suspended account |
| `noura.admin@kfupm.edu.sa` | Administrator (password `admin1234`) |

### Data resets on reload

There is no back end. All data lives in memory in `src/shared/data.js`, so **refreshing the page or typing a URL in the address bar resets everything** and signs you out. Move around the app using its links and buttons.

Purple dashed boxes marked **Prototype** or **Simulate** are demo controls that stand in for things a back end would do, such as sending an email or a network failure.

### Example: rider

1. Sign in as `majed.o@kfupm.edu.sa`.
2. **Find a ride**: search for a trip, open it and request a seat.
3. **My Rides**: follow the request, cancel it, or rate the driver after the trip.
4. **Account**: see available and held credits and the credit history.

### Example: driver

1. Sign in as `ahmed.a@kfupm.edu.sa` and open **Drive**.
2. **Post a trip**, or set up **recurring trips** from your class schedule.
3. Open a trip to accept or decline seat requests and message accepted riders.
4. After departure, **mark the trip as completed** to earn credits, then rate the riders.

### Example: administrator

1. Go to `/admin/sign-in` from the app and sign in as `noura.admin@kfupm.edu.sa`.
2. Review pending vehicle verifications, user reports, users, trips, and ratings and credits.

### Pages

| Area | Route | Page |
|---|---|---|
| Accounts | `/account/sign-up`, `/account/sign-in` | Sign up and sign in |
| Accounts | `/account/check-inbox`, `/account/verify` | Email verification |
| Accounts | `/account` | Account, credits and vehicle |
| Accounts | `/account/profile/:userId` | Public profile and reviews |
| Accounts | `/account/notifications` | Notifications |
| Accounts | `/account/report` | Report a user |
| Accounts | `/account/messages/:tripId` | Trip messages |
| Rider | `/rider` | Find a ride |
| Rider | `/rider/trip/:tripId` | Trip details and seat request |
| Rider | `/rider/rides` | My Rides |
| Rider | `/rider/credits` | Credit history |
| Rider | `/rider/rate/:bookingId` | Rate your driver |
| Driver | `/driver` | Driver dashboard |
| Driver | `/driver/trips` | My Trips |
| Driver | `/driver/post` | Post a trip |
| Driver | `/driver/trips/:tripId` | Manage a trip (requests, passengers, details) |
| Driver | `/driver/trips/:tripId/edit` | Edit a trip |
| Driver | `/driver/trips/:tripId/complete` | Mark a trip as completed |
| Driver | `/driver/trips/:tripId/rate` | Rate riders |
| Driver | `/driver/schedule` | My Schedule |
| Driver | `/driver/recurring` | Recurring trips |
| Admin | `/admin/sign-in` | Administrator sign in |
| Admin | `/admin` | Dashboard |
| Admin | `/admin/verifications`, `/admin/verifications/:userId` | Vehicle verifications |
| Admin | `/admin/trips`, `/admin/trips/:tripId` | Trips |
| Admin | `/admin/reports`, `/admin/reports/:reportId` | Reports |
| Admin | `/admin/users`, `/admin/users/:userId` | Users |
| Admin | `/admin/ratings` | Ratings and credits |

More detail on the driver pages is in [`src/driver/README.md`](src/driver/README.md).

## Dependencies and frameworks

- [React](https://react.dev) and ReactDOM — UI components
- [React Router](https://reactrouter.com) version 6 — page routing
- [Parcel](https://parceljs.org) — development server and build tool
- Plain CSS (no CSS framework)

## Project structure

```
src/
  index.html, index.js, App.js   entry point and routes
  index.css                      shared colours and base styles
  shared/                        mock data (data.js), navigation bar, not-found page
  auth/                          accounts pages
  rider/                         rider pages
  driver/                        driver pages
  admin/                         administrator pages
```

## Team

| Name | Role |
|---|---|
| Ahmed Alshareef | Accounts and shared pages (`src/auth/`) |
| Asim Alghamdi | Rider pages (`src/rider/`) |
| Abdulaziz Abdulrazaq | Driver pages (`src/driver/`) |
| Bader Alghamdi | Admin pages (`src/admin/`) |
