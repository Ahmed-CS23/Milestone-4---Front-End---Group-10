import data from "../shared/data";

// Term 261 dates (term calendar setting). Same end date the driver pages use.
const termStart = "2026-08-23";
const termEnd = "2026-12-17";

// Sample admin data, added once so the admin pages have something to show.
// Added here instead of in shared/data.js so we don't get merge conflicts with the team.
function addAdminDemoData() {
   if (data.adminDemoAdded) {
      return;
   }
   data.adminDemoAdded = true;

   // A second administrator, needed later for the second-approval flow (WF-58c).
   data.users.push({ id: "a2", name: "Omar S.", email: "omar.admin@kfupm.edu.sa", password: "admin1234", role: "admin", verified: true, status: "active", vehicleStatus: "none", vehicle: null, schedule: [] });

   // Vehicles waiting for review (WF-52). Omar B. uses Ahmed A.'s plate, to show WF-52d.
   data.users.push({ id: "u20", name: "Hamad S.", email: "s202267890@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "pending", vehicle: { make: "Honda", model: "Accord", colour: "White", plate: "4410RDA", capacity: 4 }, schedule: [], vehicleSubmittedAt: "2026-11-03" });
   data.users.push({ id: "u21", name: "Omar B.", email: "omar.b@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "pending", vehicle: { make: "Nissan", model: "Sunny", colour: "Silver", plate: "4821RKA", capacity: 3 }, schedule: [], vehicleSubmittedAt: "2026-11-04" });
   data.users.push({ id: "u22", name: "Turki A.", email: "s202198765@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "rejected", rejectReason: "Vehicle details incomplete", vehicleRejections: 1, vehicle: { make: "Kia", model: "Sportage", colour: "Black", plate: "7710KSD", capacity: 4 }, schedule: [], vehicleSubmittedAt: "2026-10-28" });
   const yasser = data.users.find(u => u.id === "u4");
   if (yasser && !yasser.vehicleSubmittedAt) {
      yasser.vehicleSubmittedAt = "2026-11-01";
   }
   data.credits.push({ id: "c20", userId: "u20", type: "starting", amount: 2, label: "Starting credits", date: "2026-09-28" });
   data.credits.push({ id: "c21", userId: "u21", type: "starting", amount: 2, label: "Starting credits", date: "2026-09-30" });
   data.credits.push({ id: "c22", userId: "u22", type: "starting", amount: 2, label: "Starting credits", date: "2026-09-30" });

   // Same fields that auth/Report.js uses when a user submits a report.
   data.reports.push({ id: "R-1001", reporterId: "u3", subjectId: "u2", tripId: "t3", category: "Unsafe driving", details: "Drove too fast on the highway.", status: "open", outcome: "", note: "", date: "2026-11-06" });
   data.reports.push({ id: "R-1003", reporterId: "u1", subjectId: "u2", tripId: "t1", category: "Asked for money or payment", details: "The note asked for 10 SAR per seat.", status: "open", outcome: "", note: "", date: "2026-11-09" });
   // Filed by Noura herself, so she can't decide it (conflict of interest, WF-55b)
   data.reports.push({ id: "R-1004", reporterId: "a1", subjectId: "u1", tripId: "t3", category: "Harassment or inappropriate behaviour", details: "Filed for the driver by email: the rider sent offensive messages.", status: "open", outcome: "", note: "", date: "2026-11-07" });
   data.reports.push({ id: "R-1002", reporterId: "u1", subjectId: "u6", tripId: null, category: "Asked for money or payment", details: "Asked me to pay cash for the ride.", status: "escalated", outcome: "", note: "", date: "2026-11-02" });

   // An abusive rating, flagged by a report (WF-57). Same fields as driver/RateRiders.js.
   data.ratings.push({ id: "rt1", tripId: "t3", fromId: "u1", toId: "u2", stars: 1, review: "Useless, rude driver. Total idiot — avoid him.", date: "2026-11-06", flagged: true, flaggedBy: "R-1005", deleted: false });
   data.reports.push({ id: "R-1005", reporterId: "u2", subjectId: "u1", tripId: "t3", category: "Harassment or inappropriate behaviour", details: "The review Faisal left about me is abusive.", status: "open", outcome: "", note: "", date: "2026-11-08" });

   // Credit adjustments above 5 credits wait for a second administrator (FR-A7 step 3).
   data.creditApprovals = [
      { id: "ca1", userId: "u3", amount: 6, justification: "Refund for three trips cancelled by the driver.", requestedBy: "a2", status: "pending", date: "2026-11-10" }
   ];

   // Every admin action is written here (FR-A3 step 4, FR-A4 step 4).
   data.auditLog = [];
}

addAdminDemoData();

// The signed-in administrator, or undefined.
function getAdmin() {
   return data.users.find(e => e.id === data.session.userId && e.role === "admin");
}

// Is a date ("2026-11-15" or "2026-11-15T07:15") between from and to? Both ends included.
function inRange(date, from, to) {
   const day = date.substring(0, 10);
   return day >= from && day <= to;
}

// "4821RKA" → "4821 RKA" (same as auth/Account.js)
function formatPlate(plate) {
   return plate.substring(0, plate.length - 3) + " " + plate.substring(plate.length - 3);
}

// Send a notification to a user. Same fields as driverUtils.notify, so auth/Notifications.js shows it.
function notify(userId, type, title, text, link) {
   data.notifications.push({
      id: "n" + Date.now() + Math.floor(Math.random() * 1000),
      userId: userId,
      type: type,
      title: title,
      text: text,
      link: link,
      date: new Date().toISOString().substring(0, 16),
      read: false
   });
}

// Write who did what, and when (every admin action). Returns the entry so pages can show its id.
function addAudit(action, targetId, detail) {
   const entry = {
      id: "A-" + (2001 + data.auditLog.length),
      adminId: data.session.userId,
      action: action,
      targetId: targetId,
      detail: detail,
      date: new Date().toISOString()
   };
   data.auditLog.push(entry);
   return entry;
}

// "driver", "rider" or "admin": how a person took part in a report (from the linked trip if there is one)
function roleText(userId, tripId) {
   const user = data.users.find(u => u.id === userId);
   if (!user) {
      return "";
   }
   if (user.role === "admin") {
      return "admin";
   }
   const trip = data.trips.find(t => t.id === tripId);
   if (trip) {
      return trip.driverId === userId ? "driver" : "rider";
   }
   return user.vehicleStatus === "approved" ? "driver" : "rider";
}

// ---------- Users (WF-56) ----------

// "Active", "Suspended" or "Unverified"
function userStatus(user) {
   if (user.status === "suspended") {
      return "Suspended";
   }
   return user.verified ? "Active" : "Unverified";
}

function statusTone(user) {
   const tones = { Active: "green", Suspended: "red", Unverified: "grey" };
   return tones[userStatus(user)];
}

// "Administrator", "Rider · Driver" or "Rider" (one account can be both, Milestone 3 section 2)
function capabilityText(user) {
   if (user.role === "admin") {
      return "Administrator";
   }
   return user.vehicleStatus === "approved" ? "Rider · Driver" : "Rider";
}

// "Sep 2026": the starting credits are given when the email is verified (FR-R1 step 6)
function joinedText(user) {
   const starting = data.credits.find(c => c.userId === user.id && c.type === "starting");
   if (!starting) {
      return "—";
   }
   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
   return months[Number(starting.date.substring(5, 7)) - 1] + " " + starting.date.substring(0, 4);
}

const admin = {
   termStart: termStart,
   termEnd: termEnd,
   getAdmin: getAdmin,
   inRange: inRange,
   formatPlate: formatPlate,
   notify: notify,
   addAudit: addAudit,
   roleText: roleText,
   userStatus: userStatus,
   statusTone: statusTone,
   capabilityText: capabilityText,
   joinedText: joinedText
};

export default admin;
