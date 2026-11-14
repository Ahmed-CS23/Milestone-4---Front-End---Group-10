# AI Usage Declaration – SWE 363 Term Project

Use this template by fill it in, and export it as PDF. See the AI Usage Guidelines for the rules.

## Part A – Team Information

| Field             | Value      |
| ----------------- | ---------- |
| Team numbers      | 10         |
| Section           | 02         |
| Project title     | Uniride    |
| Milestone (Phase) | 4          |
| Submission date   | 11/14/2026 |

## Part B – Individual Declarations

_Each member completes one block and ticks one option. Repeat for every member._

**Member: Ahmed Alshareef – 202359090 – building Account pages**

\[ \] **Option 1 – I used AI tools in this milestone.**

- Tools and models:
- Purposes: Scope check against Figma and the brief; explanations of useState and controlled inputs; reviews of my code; CSS dimension help
- Parts of the deliverable affected: SignIn.js, SignUp.js, CheckInbox.js, Verify.js, Account.js, Profile.js, Notifications.js, Report.js, Messages.js, names.js, dates.js and their CSS files
- Usage Log IDs (Part C): C01

I declare that the Usage Log and the attached evidence contain **all** of my AI use in this milestone, with complete and unedited conversations, and that I understand and can explain all AI-assisted content I contributed.

Signature: Ahmed Alshareef Date: 14/11/2026

**Member: Abdulaziz Abdulrazaq – 202023120 – building Driver pages**

\[X\] **Option 1 – I used AI tools in this milestone.**

- Tools and models: Claude (Claude Opus 5.5) in the Claude desktop app
- Purposes: I gave Claude our Figma frames (WF-30 to WF-41) and the team plan. Claude wrote the React code for the 9 driver pages, tested every page in a browser, and prepared the commits. I chose the scope, checked the screens against Figma, and merged PR #7.
- Parts of the deliverable affected: src/driver/ (all 25 files: the 9 driver pages, driverUtils.js, DriverUI.js, DriverGuard.js, their CSS files and README.md) and AI_USAGE.md
- Usage Log IDs (Part C): C02, A01

I declare that the Usage Log and the attached evidence contain **all** of my AI use in this milestone, with complete and unedited conversations, and that I understand and can explain all AI-assisted content I contributed.


Signature: Abdulaziz Abdulrazaq Date: 14/11/2026

**Member: \[Asim Khalid Al Ghamdi\] – \[202356250\] – \[team member\](i did src/Rider/)**

\[ \] **Option 1 – I used AI tools in this milestone.**

- Tools and models: Claude 5.5 opus at desktop
- Purposes: I used Claude to review the Rider pages against the milestone requirements and wireframes.
- Parts of the deliverable affected: The JavaScript and CSS files in src/rider/ for Find a Ride, Trip Details, My Rides, Rate Driver, and Credit History. This included trip search and filters, booking and cancellation, driver ratings, and credit history and their CSS files.
- Usage Log IDs (Part C):C4 and A1

I declare that the Usage Log and the attached evidence contain **all** of my AI use in this milestone, with complete and unedited conversations, and that I understand and can explain all AI-assisted content I contributed.


Signature: Asim AlGhamdi _\_**\_**\_**\_**\_**\_**_ Date: \_14/11/2026_\_**\_**\____

**Member: Bader Alghamdi – 202358650 – ../src/admin**

\[ \] **Option 1 – I used AI tools in this milestone.**

- Tools and models: Claude (Anthropic) via claude.ai, Claude Sonnet 5.5.
- Purposes:
- \- Planning the structure of the admin pages (sign-in gate, layout, dashboard, verifications, trips, reports, users, ratings & credits).
- \- Drafting example code and CSS that I adapted, rewrote and changed.
- \- Debugging and code review: finding logic errors in dashboard calculations, CSV export, report and trip workflows, and credit adjustments.
- \- Generating demo admin data (extra admin, pending verifications, sample reports and credit approvals).
- \- Checking edge cases and a final review for possible crashes.
- Parts of the deliverable affected:

src/admin: AdminSignIn.js, AdminLayout.js, AdminUI.js, adminData.js, AdminDashboard.js, Verifications.js, VerificationReview.js, AdminTrips.js, AdminTripDetails.js, Reports.js, ReportDetails.js, Users.js, UserDetails.js, RatingsCredits.js, AdjustBalance.js, AdminCreditHistory.js, and their CSS files.  
Almost all so i used the ai as a check to validate my work and give me the green light to go to the next feature

- Usage Log IDs (Part C): C03

I declare that the Usage Log and the attached evidence contain **all** of my AI use in this milestone, with complete and unedited conversations, and that I understand and can explain all AI-assisted content I contributed.

Signature: Bader Date: 14/11/2026

## Part C – AI Usage Log

_One row per conversation (C01, C02, ...) or AI-generated artifact (A01, A02, ...)._

| ID  | Member               | Tool (model)                             | Date(s)       | Purpose                                                                                                                                                                                                                                                                                                                                                            | Part of deliverable affected                                                                                                                                                                                                                                                                                  | What you changed and how you verified it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Evidence file                                                  |
| --- | -------------------- | ---------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| C01 | Ahmed Alshareef      | Claude (Claude Opus 5.5)                 | 9–14 Nov 2026 | Scope check against Figma and the brief; explanations of useState and controlled inputs; reviews of my code; CSS dimension help                                                                                                                                                                                                                                    | SignIn.js, SignUp.js, CheckInbox.js, Verify.js, Account.js, Profile.js, Notifications.js, Report.js, Messages.js, names.js, dates.js and their CSS files                                                                                                                                                      | I wrote the JS logic and JSX myself and used Claude to review it. I applied some suggestions (e.g. stripping the password from state, keyboard-accessible buttons, an empty-reviews fix, a shared formatDate) and rejected others (e.g. .some(), aria-hidden, border-radius, line-height, cursor) to stay within the zyBooks material. Verified by **\[how you tested: e.g. ran each page in the browser, tried each error/success state, checked the avatar size in DevTools\]**                                                                                                                                                      | <https://claude.ai/share/cd2c819e-b368-4fbc-8b9d-d0c0b530c9d1> |
| C02 | Abdulaziz Abdulrazaq | Claude (Claude Opus 5.5)                 | Nov 2026      | Build the 9 driver pages from our Figma and team plan                                                                                                                                                                                                                                                                                                              | src/driver/ (25 files)                                                                                                                                                                                                                                                                                        | Claude wrote the code. I did not edit it by hand. I checked each screen against Figma and merged PR #7. Claude tested all pages and states with automated browser tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | C02-Abdulaziz-Claude-driver-pages                              |
| A01 | Abdulaziz Abdulrazaq | Claude (Claude Opus 5.5)                 | Nov 2026      | Generated code and page screenshots                                                                                                                                                                                                                                                                                                                                | Folder src/driver/                                                                                                                                                                                                                                                                                            | The final code is the same as the generated code. Screenshots of all pages are in the evidence ZIP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | A01-Abdulaziz-Claude-driver-screenshots                        |
| C03 | Bader Alghamdi       | Claude (Claude Sonnet 5.5) via claude.ai | 14 Nov 2026   | Planning the structure of the admin pages (sign-in gate, layout, dashboard, verifications, trips, reports, users, ratings & credits). Drafting example code and CSS. Debugging and code review of dashboard calculations, CSV export, report and trip workflows, and credit adjustments. Generating demo admin data. Checking edge cases and a final crash review. | src/admin: AdminSignIn.js, AdminLayout.js, AdminUI.js, adminData.js, AdminDashboard.js, Verifications.js, VerificationReview.js, AdminTrips.js, AdminTripDetails.js, Reports.js, ReportDetails.js, Users.js, UserDetails.js, RatingsCredits.js, AdjustBalance.js, AdminCreditHistory.js, and their CSS files. | I built each admin feature myself and used Claude as a check on my work: I asked it to review each feature before I moved on to the next. I adapted, rewrote and changed any example code or CSS it drafted rather than pasting it in as-is. I fixed the logic errors it flagged (dashboard calculations, CSV export, report/trip workflows, credit adjustments). I ran the app and checked each page and workflow manually.                                                                                                                                                                                                           | <https://claude.ai/share/1f31a9b9-5684-4c1a-8bec-873e31fd8d41> |
| c4  | Asim AlGhamdi        | Claude 5.5 opus                          | 14 nov 2026   | The whole conversation: comparing the rider pages (FindRide, MyRides, TripDetails, RateDriver, CreditHistory) with the Team Plan, the Milestone 3 wireframes and the Phase 2 proposal; code reviews; suggested and reference code.                                                                                                                                 | All files in src/rider/ (JS and CSS)                                                                                                                                                                                                                                                                          | Used the reviews as checklists to revise each page. Compared to my own code with the reference code for missing states and to keep pages consistent (shared credit helpers, credit label format, published-ratings rule). Verified by sending revised code back for review against the matching wireframe frames and requirements (FR-R2 to FR-R8). Individual outputs are logged as A1–A12.                                                                                                                                                                                                                                           | <https://claude.ai/share/1902c33e-cb70-473d-8798-ae9ccf36f518> |
| A2  | Asim Al Ghamdi       | Claude 5.5 opus                          | 14/11/2026    | AI-generated reference code for all five rider pages (JS and CSS), produced in conversation C1 after reviewing my own code against the Team Plan, the Milestone 3 wireframes and the Phase 2 proposal                                                                                                                                                              | CreditHistory.js<br>CreditHistory.css<br><br>RateDriver.js<br><br>RateDriver.css<br><br>TripDetails.js<br><br>TripDetails.css<br><br>FindRide.js<br><br>FindRide.css<br><br>MyRides.js<br><br>MyRides.css                                                                                                     | Compared each AI file with my own version and took over the missing states and fixes:<br><br>• FindRide: filter sheet, chips, empty states, save alert<br><br>• TripDetails: disabled request states, request errors<br><br>• MyRides: shared credit helpers, ended trips, expired requests<br><br>• RateDriver: error banner, submitted and closed states<br><br>• CreditHistory: admin details, colouring<br><br>Verified by checking every page's states against its wireframe frames (WF-20 to WF-28) and requirements (FR-R2 to FR-R8), and by checking that the credit numbers (Balance = Available + Held) match on every page. | https://drive.google.com/file/d/1ureH31fcqFxFpR9MFmEs_EKuioSdu1Zx/view?usp=sharing       |

## Part D – Team Statement

We confirm that this declaration is complete and accurate. We take full responsibility for our submission, including AI-assisted parts, and understand that AI errors are not an excuse. We understand that a missing declaration results in a grade of zero, and that a false or incomplete declaration is an academic integrity violation.

| Member name          | KFUPM ID  | Signature            | Date       |
| -------------------- | --------- | -------------------- | ---------- |
| Ahmed Alshareef      | 202359090 | Ahmed Alshareef      | 14/11/2026 |
| Abdulaziz Abdulrazaq | 202023120 | Abdulaziz Abdulrazaq | 14/11/2026 |
| Bader Alghamdi       | 20238650  | Bader                | 14/11/2026 |
| Asim AlGhamdi        | 202356250 | Asim AlGhamdi        | 14/11/2026 |
