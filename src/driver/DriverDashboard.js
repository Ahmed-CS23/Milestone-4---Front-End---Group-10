import { Link } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard from "./DriverGuard";
import TopBar, { Pill } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./DriverDashboard.css";

// WF-30 · Driver dashboard (mobile) and WF-30D (desktop, ≥ 1024 px)
function DriverDashboard() {
   const user = utils.getSignedInUser();

   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }

   const mine = data.trips.filter(t => t.driverId === user.id);
   const awaiting = mine.filter(t => utils.getTripState(t) === "awaiting");
   const upcoming = mine.filter(t => {
      const state = utils.getTripState(t);
      return state === "open" || state === "full";
   });
   upcoming.sort((a, b) => (a.departure > b.departure ? 1 : -1));
   const firstName = user.name.split(" ")[0];

   function tripCard(t) {
      const pending = utils.getBookings(t.id, "pending").length;
      return (
         <Link key={t.id} className="driver-trip" to={"/driver/trips/" + t.id}>
            <div className="driver-split">
               <span className="driver-strong">{utils.formatDeparture(t.departure)}</span>
               {t.seatsLeft === 0 ?
                  <Pill tone="amber">Full</Pill> :
                  <Pill tone="green">{t.seatsLeft} {t.seatsLeft === 1 ? "seat" : "seats"} left</Pill>}
            </div>
            <span className="driver-hint">{t.origin} → {t.destination}</span>
            {pending > 0 && t.seatsLeft > 0 && <span><Pill tone="blue">{pending} pending {pending === 1 ? "request" : "requests"}</Pill></span>}
            {pending > 0 && t.seatsLeft === 0 && <span><Pill tone="amber">{pending} waitlisted</Pill></span>}
         </Link>
      );
   }

   return (
      <div>
         <NavBar />
         <div className="driver-card driver-wide">
            <TopBar title="Drive" />
            <h2 className="driver-greeting">{utils.greeting()}, {firstName}</h2>

            <div className="driver-dash">
               <div className="driver-dash-side">
                  <div className="driver-summary">
                     <div className="driver-split">
                        <span className="driver-hint">Ride-credit balance</span>
                        <Link className="driver-strong" to="/rider/credits">History ›</Link>
                     </div>
                     <p><span className="driver-big">{utils.getAvailableCredits(user.id)}</span> credits</p>
                  </div>

                  <div className="driver-summary driver-desktop-only">
                     <span className="driver-hint">Upcoming trips</span>
                     <p className="driver-big">{upcoming.length}</p>
                     {upcoming.length > 0 && <span className="driver-hint">Next: {utils.formatDeparture(upcoming[0].departure)}</span>}
                  </div>

                  {awaiting.map(t => (
                     <div key={t.id} className="driver-awaiting">
                        <span className="driver-awaiting-label">Awaiting completion</span>
                        <p className="driver-strong">{utils.formatDeparture(t.departure)}</p>
                        <p className="driver-hint">{t.origin} → {t.destination} · {utils.getBookings(t.id, "accepted").length} accepted riders</p>
                        <p className="driver-hint">Mark it completed by {utils.formatDeadline(utils.completionDeadline(t))} (48 h after departure) or it expires with no credits.</p>
                        <Link className="driver-button" to={"/driver/trips/" + t.id + "/complete"}>Mark as completed</Link>
                     </div>
                  ))}
               </div>

               <div className="driver-dash-main">
                  <div className="driver-split">
                     <h2>Upcoming trips</h2>
                     <Link className="driver-strong" to="/driver/trips">My Trips</Link>
                  </div>

                  {upcoming.length === 0 && (
                     <p className="driver-hint">No upcoming trips. Post a trip you already make, or import your schedule to publish recurring trips.</p>
                  )}
                  {upcoming.slice(0, 4).map(t => tripCard(t))}

                  <div className="driver-buttons">
                     <Link className="driver-button" to="/driver/post">Post a trip</Link>
                     <Link className="driver-secondary" to="/driver/schedule?tab=import">Import schedule</Link>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

export default DriverDashboard;
