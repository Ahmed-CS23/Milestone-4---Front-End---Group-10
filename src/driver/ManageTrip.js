import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard, { NoAccess, TripNotFound } from "./DriverGuard";
import TopBar, { Toast, Pill, Avatar, Banner, stateTone } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./ManageTrip.css";

// WF-33 trip management (Details), WF-33a departed, WF-34 seat requests (a–d), WF-35 passengers, WF-37 cancel
// FR-D4, FR-D5, FR-D6
function ManageTrip() {
   const { tripId } = useParams();
   const navigate = useNavigate();
   const [params] = useSearchParams();
   const trip = data.trips.find(t => t.id === tripId);

   let firstTab = params.get("tab");
   if (!firstTab) {
      firstTab = trip && utils.getBookings(trip.id, "pending").length > 0 ? "requests" : "details";
   }
   const [tab, setTab] = useState(firstTab);
   const [toast, setToast] = useState("");
   const [failed, setFailed] = useState("");
   const [declining, setDeclining] = useState(null);
   const [reason, setReason] = useState("");
   const [confirmCancel, setConfirmCancel] = useState(false);
   const [changes, setChanges] = useState(0);

   const user = utils.getSignedInUser();
   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }
   if (!trip) {
      return <TripNotFound />;
   }
   if (trip.driverId !== user.id) {
      return <NoAccess />;
   }

   const state = utils.getTripState(trip);
   const isUpcoming = state === "open" || state === "full";
   const pending = utils.getBookings(trip.id, "pending");
   const accepted = utils.getBookings(trip.id, "accepted");
   const passengers = state === "completed" ? utils.getBookings(trip.id, "completed") : accepted;

   // Confirmation coming from another page (WF-32b, WF-36b)
   let pageToast = toast;
   if (pageToast === "" && params.get("msg") === "published") {
      pageToast = "Trip published. Riders can now find it on the board.";
   }
   if (pageToast === "" && params.get("msg") === "edited" && trip.lastChange) {
      const n = params.get("n") || "0";
      pageToast = "Changes saved. " + n + (n === "1" ? " rider was" : " riders were") + " notified: " + trip.lastChange + ".";
   }

   function riderLine(riderId, withBalance) {
      const rating = utils.getRatingValue(riderId);
      const parts = [rating === "" ? "New rider" : "★ " + rating];
      const count = utils.getCompletedCount(riderId);
      parts.push(withBalance ? utils.plural(count, "trip") : count + " completed " + (count === 1 ? "trip" : "trips"));
      if (withBalance) {
         parts.push("balance " + utils.plural(utils.getBalance(riderId), "credit"));
      }
      return parts.join(" · ");
   }

   // FR-D4 steps 4–6
   function accept(booking) {
      const current = data.bookings.find(b => b.id === booking.id);
      if (!isUpcoming || trip.seatsLeft < 1 || !current || current.status !== "pending") {
         setFailed("This request can’t be accepted any more. It was withdrawn or the seat was taken. The list is refreshed.");
         setChanges(changes + 1);
         return;
      }
      current.status = "accepted";
      trip.seatsLeft = trip.seatsLeft - 1;
      if (trip.seatsLeft === 0) {
         trip.status = "full";
      }
      utils.notify(current.riderId, "accepted", "Seat confirmed",
         user.name + " accepted your request for " + utils.formatDeparture(trip.departure) + ".", "/rider/rides");
      setFailed("");
      setToast(utils.getUserName(current.riderId) + " accepted." + (trip.seatsLeft === 0 ? " The trip is now full." : ""));
      setChanges(changes + 1);
   }

   // FR-D4 step 7: optional reason, rider notified, held credit released
   function decline() {
      const booking = declining;
      booking.status = "declined";
      booking.declineReason = reason.trim();
      let text = user.name + " declined your request for " + utils.formatDeparture(trip.departure) + ".";
      if (booking.declineReason !== "") {
         text = text + " Reason: " + booking.declineReason;
      }
      utils.notify(booking.riderId, "info", "Request declined", text, "/rider");
      setToast("Request declined. " + utils.getUserName(booking.riderId) + " was notified.");
      setDeclining(null);
      setReason("");
      setChanges(changes + 1);
   }

   // FR-D5 steps 5–7
   function cancelTrip() {
      const affected = pending.concat(accepted);
      for (let i = 0; i < affected.length; i++) {
         affected[i].status = "cancelled";
         affected[i].cancelledBy = "driver";
         utils.notify(affected[i].riderId, "changed", "Trip cancelled",
            user.name + " cancelled the trip on " + utils.formatDeparture(trip.departure) + ". Your held credit is back in your balance.", "/rider");
      }
      trip.status = "cancelled";
      navigate("/driver/trips?tab=past&msg=cancelled&n=" + affected.length);
   }

   let headerPill = <Pill tone={trip.seatsLeft === 0 ? "amber" : "green"}>{utils.seatsText(trip)}</Pill>;
   if (!isUpcoming) {
      headerPill = <Pill tone={stateTone(state)}>{utils.stateText[state]}</Pill>;
   }

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="My trip" back="/driver/trips" />
            <Toast text={pageToast} />
            {failed && <Banner type="error" title="Accept failed"><p>{failed}</p></Banner>}

            <div className="driver-split">
               {headerPill}
               <span className="driver-hint">{trip.seriesId ? "Series · " + utils.seriesDays(trip.seriesId) : "Single trip"}</span>
            </div>
            <p className="driver-heading">{utils.formatHeading(trip.departure)}</p>
            <p className="driver-strong"><span aria-hidden="true">📍</span> {trip.origin} → {trip.destination}</p>

            <div className="driver-tabs" role="tablist">
               <button type="button" role="tab" aria-selected={tab === "requests"}
                  className={tab === "requests" ? "driver-tab driver-tab-on" : "driver-tab"}
                  onClick={() => setTab("requests")}>Requests ({pending.length})</button>
               <button type="button" role="tab" aria-selected={tab === "passengers"}
                  className={tab === "passengers" ? "driver-tab driver-tab-on" : "driver-tab"}
                  onClick={() => setTab("passengers")}>Passengers ({passengers.length})</button>
               <button type="button" role="tab" aria-selected={tab === "details"}
                  className={tab === "details" ? "driver-tab driver-tab-on" : "driver-tab"}
                  onClick={() => setTab("details")}>Details</button>
            </div>

            {tab === "requests" && (
               <>
                  {state === "full" && pending.length > 0 && (
                     <Banner type="warning" title="Trip full">
                        <p>Remaining requests stay pending as waitlisted. You can accept them if a seat opens; they expire at departure.</p>
                     </Banner>
                  )}
                  {pending.length === 0 && <p className="driver-hint">No pending requests. You’ll get a notification when a rider requests a seat.</p>}
                  {pending.map(b => (
                     <div key={b.id} className="driver-box">
                        <div className="driver-person">
                           <Avatar name={utils.getUserName(b.riderId)} />
                           <div className="driver-person-text">
                              <p className="driver-strong">{utils.getUserName(b.riderId)} {state === "full" && <Pill tone="amber">Waitlisted</Pill>}</p>
                              <p className="driver-hint">{riderLine(b.riderId, true)}</p>
                           </div>
                           <Link className="driver-strong" to={"/account/profile/" + b.riderId}>Profile</Link>
                        </div>
                        {b.note ? <p className="driver-quote">“{b.note}”</p> : <p className="driver-hint">No note</p>}
                        {isUpcoming && (
                           <div className="driver-buttons">
                              <button type="button" className="driver-secondary" onClick={() => { setDeclining(b); setReason(""); }}>Decline</button>
                              <button type="button" className="driver-button" disabled={trip.seatsLeft < 1}
                                 onClick={() => accept(b)}>{trip.seatsLeft < 1 ? "No seats left" : "Accept"}</button>
                           </div>
                        )}
                     </div>
                  ))}
                  {isUpcoming && pending.length > 0 && state !== "full" && (
                     <p className="driver-hint">Accepting reserves the rider’s held credit and takes one seat. When seats reach 0 the trip becomes Full; remaining requests stay pending as waitlisted.</p>
                  )}
                  {state === "full" && <button type="button" className="driver-text-link driver-center" onClick={() => setTab("passengers")}>View passengers ({passengers.length})</button>}
               </>
            )}

            {tab === "passengers" && (
               <>
                  <p className="driver-hint">{passengers.length} of {trip.seats} seats filled</p>
                  {passengers.map(b => (
                     <div key={b.id} className="driver-box">
                        <div className="driver-person">
                           <Avatar name={utils.getUserName(b.riderId)} />
                           <div className="driver-person-text">
                              <p className="driver-strong">{utils.getUserName(b.riderId)}</p>
                              <p className="driver-hint">{riderLine(b.riderId, false)}</p>
                              <p className="driver-hint">{b.note ? "Note: “" + b.note + "”" : "No note"}</p>
                           </div>
                        </div>
                        <div className="driver-buttons">
                           <Link className="driver-secondary" to={"/account/profile/" + b.riderId}>Profile</Link>
                           <Link className="driver-secondary" to={"/account/messages/" + trip.id}>Message</Link>
                        </div>
                     </div>
                  ))}
                  <Banner type="info">
                     <p>Phone numbers and email addresses are never shown. Use in-app messages to coordinate the pickup.</p>
                  </Banner>
               </>
            )}

            {tab === "details" && (
               <>
                  {state === "awaiting" && (
                     <Banner type="info">
                        <p>This trip departed at {utils.formatTime(new Date(trip.departure))}. It can no longer be edited or cancelled.
                           Mark it as completed within 48 hours (by {utils.formatDeadline(utils.completionDeadline(trip))}).</p>
                     </Banner>
                  )}
                  {(state === "cancelled" || state === "expired" || state === "removed") && (
                     <Banner type="info">
                        <p>This trip is {utils.stateText[state].toLowerCase()}. Riders were notified and their held credits released.</p>
                     </Banner>
                  )}

                  <dl className="driver-details">
                     <div><dt>Origin area</dt><dd>{trip.origin}</dd></div>
                     <div><dt>Destination</dt><dd>{trip.destination}</dd></div>
                     <div><dt>Pickup point</dt><dd>{trip.pickup}</dd></div>
                     <div><dt>Seats</dt><dd>{trip.seats} offered · {trip.seats - trip.seatsLeft} accepted · {trip.seatsLeft} remaining</dd></div>
                     <div><dt>Note</dt><dd>{trip.note || "–"}</dd></div>
                     {trip.seriesId && <div><dt>Series</dt><dd>{utils.seriesDays(trip.seriesId)} until {utils.formatDay(utils.seriesEnd(trip.seriesId))} (this occurrence only)</dd></div>}
                     {trip.lastChange && <div><dt>Last change</dt><dd>{trip.lastChange} · riders notified</dd></div>}
                  </dl>

                  {state === "awaiting" && <Link className="driver-button" to={"/driver/trips/" + trip.id + "/complete"}>Mark as completed</Link>}
                  {state === "completed" && <Link className="driver-button" to={"/driver/trips/" + trip.id + "/rate"}>Rate riders</Link>}
                  {(isUpcoming || state === "awaiting") && (
                     <>
                        {isUpcoming ?
                           <Link className="driver-secondary" to={"/driver/trips/" + trip.id + "/edit"}>Edit trip</Link> :
                           <button type="button" className="driver-secondary" disabled>Edit trip</button>}
                        <button type="button" className="driver-danger" disabled={!isUpcoming}
                           onClick={() => setConfirmCancel(true)}>Cancel trip</button>
                     </>
                  )}
                  {isUpcoming && <p className="driver-hint">Editing and cancelling lock at departure ({utils.formatTime(new Date(trip.departure))}).</p>}
               </>
            )}
         </div>

         {declining && (
            <div className="driver-modal-back">
               <div className="driver-modal" role="dialog" aria-modal="true" aria-labelledby="decline-title">
                  <h2 id="decline-title">Decline {utils.getUserName(declining.riderId)}’s request?</h2>
                  <label htmlFor="reason">Reason (optional)</label>
                  <textarea id="reason" rows="3" maxLength="200" value={reason} onChange={e => setReason(e.target.value)} />
                  <p className="driver-hint">Shared with the rider · up to 200 characters · {reason.length}/200</p>
                  <p className="driver-hint">{utils.getUserName(declining.riderId).split(" ")[0]} will be notified and the held credit released.</p>
                  <button type="button" className="driver-danger" onClick={decline}>Decline request</button>
                  <button type="button" className="driver-text-link driver-center" onClick={() => setDeclining(null)}>Back</button>
               </div>
            </div>
         )}

         {confirmCancel && (
            <div className="driver-modal-back">
               <div className="driver-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
                  <h2 id="cancel-title">Cancel this trip?</h2>
                  <div className="driver-summary">
                     <p className="driver-strong">{utils.formatDeparture(trip.departure)}</p>
                     <p className="driver-hint">{trip.origin} → {trip.destination}</p>
                  </div>
                  <Banner type="warning" title={(accepted.length + pending.length) + " riders affected"}>
                     <p>{accepted.length} accepted {accepted.length === 1 ? "rider" : "riders"} and {pending.length} pending {pending.length === 1 ? "request" : "requests"} will be notified. All their held credits will be released.</p>
                  </Banner>
                  <p className="driver-muted">The trip will be removed from the board. This can’t be undone.</p>
                  <button type="button" className="driver-danger" onClick={cancelTrip}>Cancel trip</button>
                  <button type="button" className="driver-text-link driver-center" onClick={() => setConfirmCancel(false)}>Keep trip</button>
               </div>
            </div>
         )}
      </div>
   );
}

export default ManageTrip;
