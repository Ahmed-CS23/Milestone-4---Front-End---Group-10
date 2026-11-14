import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard, { NoAccess, TripNotFound } from "./DriverGuard";
import TopBar, { Toast, Pill, Banner } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./CompleteTrip.css";

// WF-40 · Mark as completed, WF-40a trip completed, WF-40b completion window expired (FR-D7)
function CompleteTrip() {
   const { tripId } = useParams();
   const [ticked, setTicked] = useState({});
   const [done, setDone] = useState(null);

   const user = utils.getSignedInUser();
   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }
   const trip = data.trips.find(t => t.id === tripId);
   if (!trip) {
      return <TripNotFound />;
   }
   if (trip.driverId !== user.id) {
      return <NoAccess />;
   }

   // WF-40a
   if (done) {
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Complete trip" back="/driver/trips" />
               <Toast text={"Trip completed. You earned " + done.earned + " ride " + (done.earned === 1 ? "credit." : "credits.")} />
               <div className="driver-summary">
                  <div className="driver-split">
                     <span className="driver-hint">Ride-credit balance</span>
                     <Link className="driver-strong" to="/rider/credits">History ›</Link>
                  </div>
                  <p><span className="driver-number">{utils.getAvailableCredits(user.id)}</span> credits</p>
               </div>
               <div>
                  {done.rows.map(r => (
                     <div key={r.id} className="driver-check-row">
                        <span className="driver-strong">{r.name}</span>
                        {r.travelled ? <Pill tone="green">Travelled</Pill> : <Pill tone="red">Did not travel</Pill>}
                     </div>
                  ))}
               </div>
               <p className="driver-hint">
                  Travelled riders’ held credits were spent.
                  {done.noShows.length > 0 && " " + done.noShows.join(", ") + (done.noShows.length === 1 ? "’s" : "’") + " held credit was not returned; this can be disputed with the moderators."}
               </p>
               {done.earned > 0 ?
                  <Link className="driver-button" to={"/driver/trips/" + trip.id + "/rate"}>Rate riders</Link> :
                  <Link className="driver-button" to="/driver/trips?tab=past">Back to My Trips</Link>}
               <Link className="driver-center driver-strong" to="/driver">Later</Link>
            </div>
         </div>
      );
   }

   const state = utils.getTripState(trip);

   // WF-40b and other states where completion is not possible
   if (state !== "awaiting") {
      let icon = "ⓘ";
      let title = "This trip hasn’t departed yet";
      let text = "You can mark it completed after its departure time, " + utils.formatDeparture(trip.departure) + ".";
      if (state === "expired") {
         icon = "🕓";
         title = "This trip has expired";
         text = "It wasn’t marked as completed within 48 hours of departure (by " +
            utils.formatDeadline(utils.completionDeadline(trip)) + "). No credits were awarded and the riders’ held credits were released.";
      }
      else if (state === "completed") {
         icon = "✓";
         title = "Already completed";
         text = "Credits for this trip were already added. Completing it again can’t pay twice.";
      }
      else if (state === "cancelled" || state === "removed") {
         title = "This trip was " + state;
         text = "There is nothing to complete.";
      }
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Complete trip" back="/driver/trips" />
               <div className="driver-result">
                  <p className="driver-result-icon" aria-hidden="true">{icon}</p>
                  <h2>{title}</h2>
                  <p className="driver-muted">{text}</p>
               </div>
               <Link className="driver-button" to="/driver/trips">Back to My Trips</Link>
            </div>
         </div>
      );
   }

   const accepted = utils.getBookings(trip.id, "accepted");

   function isTicked(id) {
      return ticked[id] !== false;
   }

   function toggle(id) {
      setTicked(values => ({...values, [id]: !isTicked(id)}));
   }

   // FR-D7 steps 5–7: one credit per travelled rider; travelled riders' held credit is spent;
   // a no-show's held credit is not returned and the booking is marked "did not travel".
   function handleConfirm() {
      if (trip.status === "completed") {
         return;
      }
      const today = utils.toInputValue(new Date()).substring(0, 10);
      const rows = [];
      const noShows = [];
      let earned = 0;
      for (let i = 0; i < accepted.length; i++) {
         const b = accepted[i];
         const name = utils.getUserName(b.riderId);
         if (isTicked(b.id)) {
            b.status = "completed";
            earned = earned + 1;
            data.credits.push({ id: utils.newId("c"), userId: b.riderId, type: "spent", amount: -1,
               label: "Ride with " + user.name, date: today });
            utils.notify(b.riderId, "rating", "Rate your driver",
               "Your trip with " + user.name + " is complete. How was it?", "/rider/rate/" + b.id);
         }
         else {
            b.status = "no_show";
            data.credits.push({ id: utils.newId("c"), userId: b.riderId, type: "spent", amount: -1,
               label: "Did not travel · " + utils.formatDay(trip.departure), date: today });
            noShows.push(name.split(" ")[0]);
         }
         rows.push({ id: b.id, name: name, travelled: isTicked(b.id) });
      }
      if (earned > 0) {
         data.credits.push({ id: utils.newId("c"), userId: user.id, type: "earned", amount: earned,
            label: "Trip completed · " + utils.formatDay(trip.departure), date: today });
      }
      trip.status = "completed";
      trip.completedAt = utils.toInputValue(new Date());
      setDone({ earned: earned, rows: rows, noShows: noShows });
   }

   const travelledCount = accepted.filter(b => isTicked(b.id)).length;
   const noShowCount = accepted.length - travelledCount;
   const hoursAgo = Math.floor(utils.hoursSinceDeparture(trip));

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="Complete trip" back={"/driver/trips/" + trip.id} />
            <div className="driver-summary">
               <p className="driver-strong">{utils.formatDeparture(trip.departure)}</p>
               <p className="driver-hint">{trip.origin} → {trip.destination} · departed {hoursAgo < 1 ? "less than an hour" : hoursAgo + (hoursAgo === 1 ? " hour" : " hours")} ago</p>
            </div>

            <h2>Who travelled?</h2>
            <p className="driver-hint">Untick anyone who did not show up.</p>
            {accepted.length === 0 && <Banner type="info"><p>No riders were accepted on this trip, so no credits will be earned.</p></Banner>}
            <div>
               {accepted.map(b => (
                  <label key={b.id} className="driver-check-row">
                     <input type="checkbox" checked={isTicked(b.id)} onChange={() => toggle(b.id)} />
                     <span>{utils.getUserName(b.riderId)} · {utils.getRatingValue(b.riderId) === "" ? "new rider" : "rating " + utils.getRatingValue(b.riderId)}</span>
                  </label>
               ))}
            </div>

            <div className="driver-summary">
               <div className="driver-split"><span>Credits you earn</span><span className="driver-strong">+{travelledCount}</span></div>
               <div className="driver-split"><span>Travelled riders’ held credit spent</span><span>{travelledCount}</span></div>
               <div className="driver-split"><span>Did not travel (held credit not returned, not rated)</span><span>{noShowCount}</span></div>
            </div>

            <p className="driver-hint">Complete by {utils.formatDeadline(utils.completionDeadline(trip))} (48 h after departure). After that the trip expires and no credits are awarded.</p>
            <button type="button" className="driver-button" onClick={handleConfirm}>Confirm completion</button>
         </div>
      </div>
   );
}

export default CompleteTrip;
