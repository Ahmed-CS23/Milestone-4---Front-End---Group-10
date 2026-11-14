import data from "../shared/data";

// Places a driver can pick. Pickup points are named gates and landmarks only (FR-D2 step 3).
const areas = ["Al-Rakah", "Al-Khobar", "Dhahran", "Dammam", "Al-Doha", "KFUPM Gate 1", "KFUPM Gate 2", "KFUPM Gate 3"];

const pickupPoints = [
   "KFUPM Gate 1",
   "KFUPM Gate 2",
   "KFUPM Gate 3",
   "Al-Rakah Pharmacy Corner",
   "Al-Khobar Corniche Parking",
   "Dhahran Mall Entrance",
   "Dammam Al-Faisaliyah Park",
   "Al-Doha Main Mosque"
];

// Term end comes from the term calendar setting (Figma WF-39 note: Term 261 ends Thu 17 Dec 2026).
const termEnd = "2026-12-17";
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOUR = 60 * 60 * 1000;

// One trip that departed 3 hours ago, so "Awaiting completion" (WF-30, WF-40) can be tried.
function addDemoTrip() {
   if (data.driverDemoAdded) {
      return;
   }
   data.driverDemoAdded = true;
   data.trips.push({
      id: "td1", driverId: "u2", origin: "KFUPM Gate 2", destination: "Al-Khobar",
      pickup: "KFUPM Gate 2", departure: toInputValue(new Date(Date.now() - 3 * HOUR)),
      seats: 3, seatsLeft: 1, note: "", status: "open"
   });
   data.bookings.push({ id: "bd1", tripId: "td1", riderId: "u3", status: "accepted", note: "", late: false });
   data.bookings.push({ id: "bd2", tripId: "td1", riderId: "u1", status: "accepted", note: "Gate 2 bus stop please.", late: false });
}

function pad(n) {
   return n < 10 ? "0" + n : "" + n;
}

function toInputValue(date) {
   return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

// "07:15" or a Date -> "7:15 AM"
function formatTime(value) {
   let hours;
   let minutes;
   if (typeof value === "string") {
      hours = Number(value.substring(0, 2));
      minutes = Number(value.substring(3, 5));
   }
   else {
      hours = value.getHours();
      minutes = value.getMinutes();
   }
   const ampm = hours >= 12 ? "PM" : "AM";
   hours = hours % 12;
   if (hours === 0) {
      hours = 12;
   }
   return hours + ":" + pad(minutes) + " " + ampm;
}

// "2026-11-15T07:15" -> "Sun 15 Nov"
function formatDay(text) {
   const d = new Date(text);
   return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()];
}

// "Sun 15 Nov · 7:15 AM"
function formatDeparture(text) {
   return formatDay(text) + " · " + formatTime(new Date(text));
}

// "7:15 AM · Sun 15 Nov 2026" (big heading on the trip page)
function formatHeading(text) {
   return formatTime(new Date(text)) + " · " + formatDay(text) + " " + new Date(text).getFullYear();
}

// "Sat 17 Oct, 4:30 PM"
function formatDeadline(date) {
   return days[date.getDay()] + " " + date.getDate() + " " + months[date.getMonth()] + ", " + formatTime(date);
}

// "2026-12-17" -> "Thu 17 Dec 2026"
function formatDate(text) {
   const d = new Date(text + "T12:00");
   return days[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

function completionDeadline(trip) {
   return new Date(new Date(trip.departure).getTime() + 48 * HOUR);
}

function hoursSinceDeparture(trip) {
   return (Date.now() - new Date(trip.departure).getTime()) / HOUR;
}

function greeting() {
   const hour = new Date().getHours();
   if (hour < 12) {
      return "Good morning";
   }
   if (hour < 17) {
      return "Good afternoon";
   }
   return "Good evening";
}

// "1 trip", "2 trips"
function plural(n, word) {
   return n + " " + word + (n === 1 ? "" : "s");
}

function getSignedInUser() {
   return data.users.find(u => u.id === data.session.userId);
}

// Team plan: new ids are a letter + Date.now(). The counter keeps ids unique inside one loop.
let idCounter = 0;
function newId(prefix) {
   idCounter = idCounter + 1;
   return prefix + Date.now() + "-" + idCounter;
}

// open / full trips whose departure passed move to "awaiting" for 48 hours, then "expired" (FR-D7).
function getTripState(trip) {
   if (trip.status === "completed" || trip.status === "cancelled" || trip.status === "removed" || trip.status === "expired") {
      return trip.status;
   }
   const hours = hoursSinceDeparture(trip);
   if (hours < 0) {
      return trip.status;
   }
   if (hours <= 48) {
      return "awaiting";
   }
   // FR-D7 step 4: after 48 hours the trip expires, no credits, and riders' holds are released.
   trip.status = "expired";
   const held = data.bookings.filter(b => b.tripId === trip.id && (b.status === "accepted" || b.status === "pending"));
   for (let i = 0; i < held.length; i++) {
      held[i].status = "expired";
   }
   return "expired";
}

const stateText = {
   open: "Open",
   full: "Full",
   awaiting: "Awaiting completion",
   completed: "Completed",
   cancelled: "Cancelled",
   removed: "Removed",
   expired: "Expired"
};

function getBookings(tripId, status) {
   return data.bookings.filter(b => b.tripId === tripId && b.status === status);
}

// "1 of 3 seats left" pill: green while seats are free, amber when none are left.
function seatsText(trip) {
   return trip.seatsLeft + " of " + trip.seats + " seats left";
}

function getRatingValue(userId) {
   const list = data.ratings.filter(r => r.toId === userId && !r.deleted);
   if (list.length === 0) {
      return "";
   }
   let total = 0;
   for (let i = 0; i < list.length; i++) {
      total = total + list[i].stars;
   }
   return "" + Math.round((total / list.length) * 10) / 10;
}

function getAverageRating(userId) {
   const value = getRatingValue(userId);
   return value === "" ? "New" : "★ " + value;
}

function getCompletedCount(userId) {
   const ridden = data.bookings.filter(b => b.riderId === userId && b.status === "completed").length;
   const driven = data.trips.filter(t => t.driverId === userId && t.status === "completed").length;
   return ridden + driven;
}

// Team plan: balance = starting + earned + spent + admin. Held = pending or accepted bookings.
function getBalance(userId) {
   let balance = 0;
   for (let i = 0; i < data.credits.length; i++) {
      const c = data.credits[i];
      if (c.userId === userId && (c.type === "starting" || c.type === "earned" ||
         c.type === "spent" || c.type === "admin")) {
         balance = balance + c.amount;
      }
   }
   return balance;
}

function getAvailableCredits(userId) {
   const held = data.bookings.filter(b => b.riderId === userId &&
      (b.status === "pending" || b.status === "accepted")).length;
   return getBalance(userId) - held;
}

function notify(userId, type, title, text, link) {
   data.notifications.push({
      id: newId("n"),
      userId: userId,
      type: type,
      title: title,
      text: text,
      link: link,
      date: toInputValue(new Date()),
      read: false
   });
}

// FR-D2 step 4: no other published trip by this driver within 60 minutes of this departure.
function findConflict(driverId, departure, ignoreTripId) {
   const time = new Date(departure).getTime();
   return data.trips.find(t => t.driverId === driverId && t.id !== ignoreTripId &&
      (t.status === "open" || t.status === "full") &&
      Math.abs(new Date(t.departure).getTime() - time) < HOUR);
}

function getUserName(userId) {
   const user = data.users.find(u => u.id === userId);
   return user ? user.name : "Unknown user";
}

// "Sun–Thu" from a series' trips
function seriesDays(seriesId) {
   const list = data.trips.filter(t => t.seriesId === seriesId);
   const used = [];
   for (let i = 0; i < list.length; i++) {
      const day = new Date(list[i].departure).getDay();
      if (used.indexOf(day) === -1) {
         used.push(day);
      }
   }
   used.sort();
   if (used.length === 0) {
      return "";
   }
   let continuous = true;
   for (let i = 1; i < used.length; i++) {
      if (used[i] !== used[i - 1] + 1) {
         continuous = false;
      }
   }
   if (continuous && used.length > 2) {
      return days[used[0]] + "–" + days[used[used.length - 1]];
   }
   return used.map(d => days[d]).join(", ");
}

function seriesEnd(seriesId) {
   const list = data.trips.filter(t => t.seriesId === seriesId);
   let last = "";
   for (let i = 0; i < list.length; i++) {
      if (list[i].departure > last) {
         last = list[i].departure;
      }
   }
   return last;
}

addDemoTrip();

const driverUtils = {
   areas: areas,
   pickupPoints: pickupPoints,
   termEnd: termEnd,
   days: days,
   pad: pad,
   addDemoTrip: addDemoTrip,
   toInputValue: toInputValue,
   formatTime: formatTime,
   formatDay: formatDay,
   formatDeparture: formatDeparture,
   formatHeading: formatHeading,
   formatDeadline: formatDeadline,
   formatDate: formatDate,
   completionDeadline: completionDeadline,
   hoursSinceDeparture: hoursSinceDeparture,
   greeting: greeting,
   plural: plural,
   getSignedInUser: getSignedInUser,
   newId: newId,
   getTripState: getTripState,
   stateText: stateText,
   getBookings: getBookings,
   seatsText: seatsText,
   getRatingValue: getRatingValue,
   getAverageRating: getAverageRating,
   getCompletedCount: getCompletedCount,
   getBalance: getBalance,
   getAvailableCredits: getAvailableCredits,
   notify: notify,
   findConflict: findConflict,
   getUserName: getUserName,
   seriesDays: seriesDays,
   seriesEnd: seriesEnd
};

export default driverUtils;
