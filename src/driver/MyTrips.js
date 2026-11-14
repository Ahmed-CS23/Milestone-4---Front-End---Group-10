import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard from "./DriverGuard";
import TopBar, { Toast, Pill, stateTone } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./MyTrips.css";

// Messages other pages send here with ?msg=... (WF-37a, WF-39b)
function toastText(params) {
   const msg = params.get("msg");
   if (msg === "cancelled") {
      const n = params.get("n") || "0";
      return "Trip cancelled. " + n + (n === "1" ? " rider was" : " riders were") + " notified and their held credits released.";
   }
   if (msg === "published") {
      return params.get("n") + " recurring trips published.";
   }
   return "";
}

// One line under a past trip that explains what happened to credits (WF-31a).
function pastOutcome(trip) {
   if (trip.status === "completed") {
      const travelled = utils.getBookings(trip.id, "completed").length;
      return trip.origin + " → " + trip.destination + " · " + utils.plural(travelled, "rider") +
         " travelled · +" + utils.plural(travelled, "credit");
   }
   if (trip.status === "expired") {
      return "Not completed within 48 h — no credits; riders’ held credits released";
   }
   if (trip.status === "cancelled") {
      const notified = data.bookings.filter(b => b.tripId === trip.id && b.cancelledBy === "driver").length;
      return "Cancelled by you · " + notified + (notified === 1 ? " rider" : " riders") + " notified, credits released";
   }
   if (trip.status === "removed") {
      return "Removed by an administrator" + (trip.removeReason ? " · Reason: " + trip.removeReason : "");
   }
   return "";
}

// WF-31 · My Trips (Upcoming / Awaiting / Past), WF-31a past, WF-31b empty
function MyTrips() {
   const [params] = useSearchParams();
   const [tab, setTab] = useState(params.get("tab") || "upcoming");
   const user = utils.getSignedInUser();

   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }

   const mine = data.trips.filter(t => t.driverId === user.id);
   const upcoming = [];
   const awaiting = [];
   const past = [];
   for (let i = 0; i < mine.length; i++) {
      const state = utils.getTripState(mine[i]);
      if (state === "open" || state === "full") {
         upcoming.push(mine[i]);
      }
      else if (state === "awaiting") {
         awaiting.push(mine[i]);
      }
      else {
         past.push(mine[i]);
      }
   }
   upcoming.sort((a, b) => (a.departure > b.departure ? 1 : -1));
   awaiting.sort((a, b) => (a.departure > b.departure ? 1 : -1));
   past.sort((a, b) => (a.departure < b.departure ? 1 : -1));

   function upcomingCard(t) {
      const pending = utils.getBookings(t.id, "pending").length;
      return (
         <Link key={t.id} className="driver-trip" to={"/driver/trips/" + t.id}>
            <div className="driver-split">
               <span className="driver-strong">{utils.formatDeparture(t.departure)}</span>
               <Pill tone={stateTone(t.status)}>{utils.stateText[t.status]}</Pill>
            </div>
            <span className="driver-hint">{t.seriesId ? "" : t.origin + " → " + t.destination + " · "}{utils.seatsText(t)}</span>
            {pending > 0 && t.seatsLeft > 0 && <span><Pill tone="blue">{pending} pending</Pill></span>}
            {pending > 0 && t.seatsLeft === 0 && <span><Pill tone="amber">{pending} waitlisted</Pill></span>}
         </Link>
      );
   }

   // Recurring occurrences are grouped under their series (WF-31 note).
   function upcomingList() {
      const groups = [];
      const singles = [];
      for (let i = 0; i < upcoming.length; i++) {
         const t = upcoming[i];
         if (t.seriesId) {
            let group = groups.find(g => g.id === t.seriesId);
            if (!group) {
               group = { id: t.seriesId, first: t, trips: [] };
               groups.push(group);
            }
            group.trips.push(t);
         }
         else {
            singles.push(t);
         }
      }
      return (
         <>
            {groups.map(g => (
               <div key={g.id} className="driver-group">
                  <p className="driver-group-title">
                     Series · {g.first.origin} → {g.first.destination} · {utils.seriesDays(g.id)} {utils.formatTime(new Date(g.first.departure))} · until {utils.formatDay(utils.seriesEnd(g.id))}
                  </p>
                  {g.trips.slice(0, 5).map(t => upcomingCard(t))}
                  {g.trips.length > 5 && <p className="driver-hint">+ {g.trips.length - 5} more in this series</p>}
               </div>
            ))}
            {singles.length > 0 && (
               <div className="driver-group">
                  {groups.length > 0 && <p className="driver-group-title">Single trip</p>}
                  {singles.map(t => upcomingCard(t))}
               </div>
            )}
         </>
      );
   }

   const counts = { upcoming: upcoming.length, awaiting: awaiting.length };
   const empty = (tab === "upcoming" && upcoming.length === 0) ||
      (tab === "awaiting" && awaiting.length === 0) || (tab === "past" && past.length === 0);

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="My Trips" back="/driver" />
            <Toast text={toastText(params)} />

            <div className="driver-tabs" role="tablist">
               {["upcoming", "awaiting", "past"].map(name => (
                  <button type="button" key={name} role="tab" aria-selected={tab === name}
                     className={tab === name ? "driver-tab driver-tab-on" : "driver-tab"}
                     onClick={() => setTab(name)}>
                     {name === "upcoming" ? "Upcoming" : name === "awaiting" ? "Awaiting" : "Past"}
                     {name !== "past" ? " (" + counts[name] + ")" : ""}
                  </button>
               ))}
            </div>

            {empty && mine.length === 0 && (
               <div className="driver-result">
                  <p className="driver-result-icon" aria-hidden="true">🚗</p>
                  <h2>No trips yet</h2>
                  <p className="driver-muted">Post a single trip, or import your class schedule to publish recurring trips in one go.</p>
               </div>
            )}
            {empty && mine.length > 0 && <p className="driver-hint driver-center">Nothing here right now.</p>}

            {tab === "upcoming" && upcomingList()}

            {tab === "awaiting" && awaiting.map(t => (
               <Link key={t.id} className="driver-trip" to={"/driver/trips/" + t.id + "/complete"}>
                  <div className="driver-split">
                     <span className="driver-strong">{utils.formatDeparture(t.departure)}</span>
                     <Pill tone="blue">Awaiting completion</Pill>
                  </div>
                  <span className="driver-hint">{t.origin} → {t.destination} · {utils.getBookings(t.id, "accepted").length} accepted riders</span>
                  <span className="driver-hint">Mark as completed by {utils.formatDeadline(utils.completionDeadline(t))}</span>
               </Link>
            ))}

            {tab === "past" && past.map(t => (
               <div key={t.id} className={t.status === "completed" ? "driver-trip" : "driver-trip driver-trip-muted"}>
                  <div className="driver-split">
                     <Link className="driver-strong driver-plain" to={"/driver/trips/" + t.id}>{utils.formatDeparture(t.departure)}</Link>
                     <Pill tone={stateTone(t.status)}>{utils.stateText[t.status]}</Pill>
                  </div>
                  <span className="driver-hint">{pastOutcome(t)}</span>
                  {t.status === "completed" && <Link className="driver-strong" to={"/driver/trips/" + t.id + "/rate"}>Rate riders</Link>}
               </div>
            ))}

            <Link className="driver-button" to="/driver/post">Post a trip</Link>
            {mine.length === 0 && <Link className="driver-secondary" to="/driver/schedule?tab=import">Import schedule</Link>}
         </div>
      </div>
   );
}

export default MyTrips;
