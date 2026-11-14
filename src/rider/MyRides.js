import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import "./MyRides.css";

const activeStatuses = ["pending", "accepted"];
const balanceTypes = ["starting", "earned", "spent", "admin"];
const dateFormat = { weekday: "short", day: "numeric", month: "short" };
const timeFormat = { ...dateFormat, hour: "numeric", minute: "2-digit", hour12: true };
export const formatDeparture = (date, dateOnly) => new Date(date).toLocaleString("en-GB", dateOnly ? dateFormat : timeFormat);
export const reportLink = (trip) => "/account/report?subject=" + encodeURIComponent(trip.driverId) + "&trip=" + encodeURIComponent(trip.id);
export const tripEnded = (trip) => trip && ["cancelled", "removed"].includes(trip.status);

function timeLeft(milliseconds) {
   const minutes = Math.ceil(milliseconds / 60000);
   const hours = Math.floor(minutes / 60);
   return hours ? hours + " h " + minutes % 60 + " min" : minutes + " min";
}

function releaseCredit(booking, date, label) {
   data.credits.push({ id: "c-release-" + booking.id, userId: booking.riderId,
      type: "released", amount: 1, label, date });
}

export function tripCreditLabel(reason, trip) {
   const driver = data.users.find((entry) => entry.id === trip.driverId);
   return reason + " · " + formatDeparture(trip.departure, true).replace(",", "") +
      " · " + (driver ? driver.name : "Unknown driver");
}

export function expireRideRequests(userId, now = Date.now()) {
   let changed = false;
   for (const booking of data.bookings) {
      if (booking.riderId !== userId || booking.status !== "pending") continue;
      const trip = data.trips.find((entry) => entry.id === booking.tripId);
      if (trip && !tripEnded(trip) && new Date(trip.departure) <= now) {
         booking.status = "expired";
         releaseCredit(booking, new Date(now).toISOString(), tripCreditLabel("Request expired", trip));
         changed = true;
      }
   }
   return changed;
}

export function heldBookings(userId, now = Date.now()) {
   return data.bookings.filter((booking) => {
      if (booking.riderId !== userId || !activeStatuses.includes(booking.status)) return false;
      const trip = data.trips.find((entry) => entry.id === booking.tripId);
      return !tripEnded(trip) && (!trip || booking.status === "accepted" || !(new Date(trip.departure) <= now));
   });
}

export function rideCredits(userId, bookings = heldBookings(userId)) {
   let balance = 0;
   for (const credit of data.credits) {
      if (credit.userId === userId && balanceTypes.includes(credit.type)) balance += credit.amount;
   }
   return { available: balance - bookings.length, held: bookings.length };
}

const twoHours = 2 * 60 * 60 * 1000;

export function CancelRideDialog({ booking, trip, user, onClose, onFinish }) {
   const [checkedAt, setCheckedAt] = useState(0);
   const now = Math.max(Date.now(), checkedAt);
   const remaining = new Date(trip.departure).getTime() - now;
   const accepted = booking.status === "accepted";
   const showLateWarning = accepted && remaining > 0 && remaining <= twoHours;
   const driver = data.users.find((entry) => entry.id === trip.driverId);
   const driverName = driver ? driver.name : "the driver";
   const cancelLabel = accepted ? "Cancel seat" : "Cancel request";

   function confirmCancel() {
      // Recheck the clock and booking before modifying the shared data.
      const cancelledAt = new Date();
      const untilDeparture = new Date(trip.departure) - cancelledAt;
      if (untilDeparture <= 0 || (accepted && untilDeparture <= twoHours && !showLateWarning)) {
         setCheckedAt(cancelledAt.getTime());
         return;
      }
      if (data.session.userId !== user.id || booking.riderId !== user.id || tripEnded(trip) || !activeStatuses.includes(booking.status)) {
         onFinish("This booking can no longer be cancelled.");
         return;
      }

      const wasAccepted = booking.status === "accepted";
      booking.status = "cancelled";
      booking.cancelledAt = cancelledAt.toISOString();
      booking.late = wasAccepted && untilDeparture <= twoHours;
      if (wasAccepted) {
         trip.seatsLeft += 1;
         if (trip.status === "full") trip.status = "open";
      }

      const id = String(cancelledAt.getTime()) + "-" + booking.id;
      const date = booking.cancelledAt;
      releaseCredit(booking, date, tripCreditLabel(booking.late ? "Late cancellation" : "Cancelled", trip));
      data.notifications.push({
         id: "n" + id, userId: trip.driverId, date, read: false,
         text: user.name + (wasAccepted ? " cancelled their seat." : " cancelled their seat request."),
         link: "/driver/trips/" + trip.id
      });

      let confirmation = wasAccepted ? "Seat cancelled." : "Request cancelled.";
      if (wasAccepted) confirmation += " " + driverName + " was notified.";
      confirmation += " 1 held credit was returned to your available credits.";
      if (booking.late) confirmation += " This was recorded as a late cancellation.";
      onFinish(confirmation);
   }

   return (
      <div className="rider-rides-overlay"
      onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
         <div className="rider-rides-card rider-rides-dialog" role="dialog" aria-modal="true"
            aria-labelledby="rider-rides-cancel-title">
            {remaining <= 0 ? <>
               <h2 id="rider-rides-cancel-title">This trip has already departed</h2>
               <p>Bookings can’t be cancelled after departure. If something went wrong, report a problem to the moderators.</p>
               <div className="rider-rides-row">
                  <Link to={reportLink(trip)}>Report a problem</Link>
                  <button className="rider-rides-button" type="button" autoFocus onClick={onClose}>Close</button>
               </div>
            </> : <>
               <h2 id="rider-rides-cancel-title">{accepted ? "Cancel your seat?" : "Cancel this request?"}</h2>
               <p>{accepted ? "Your seat on " : "Your request for "}{formatDeparture(trip.departure)} with {driverName}
                  {accepted ? " will be released to other riders and your held credit returned." : " will be withdrawn and the 1 held credit released."}
               </p>
               {showLateWarning && <p className="rider-rides-warning"><strong>Late cancellation</strong><br />
                  Departure is in {timeLeft(remaining)}. This will be recorded as a late cancellation on your reliability record.
               </p>}
               <div className="rider-rides-row">
                  <button className="rider-rides-danger" type="button" onClick={confirmCancel}>{cancelLabel}</button>
                  <button className="rider-rides-link" type="button" autoFocus onClick={onClose}>
                     {accepted ? "Keep my seat" : "Keep request"}
                  </button>
               </div>
            </>}
         </div>
         </div>
   );
}

const pageSize = 5;
const ratingWindow = 7 * 24 * 60 * 60 * 1000;
const statusLabels = {
   pending: "Pending", accepted: "Accepted", declined: "Declined",
   cancelled: "Cancelled", expired: "Expired", completed: "Completed",
   trip_cancelled: "Trip cancelled by driver", removed: "Trip removed",
   waiting: "Waiting for driver to complete",
   no_show: "Did not travel"
};

export const formatRatingDate = (date) => formatDeparture(date, true).replace(",", "");

export function ratingDeadline(trip) {
   if (!trip) return NaN;
   const completed = trip.completedAt ? new Date(trip.completedAt).getTime() : NaN;
   const start = isNaN(completed) ? new Date(trip.departure).getTime() : completed;
   return start + ratingWindow;
}

export function isRatingPublished(rating, now = Date.now()) {
   if (rating.deleted) return false;
   const trip = data.trips.find((entry) => entry.id === rating.tripId);
   if (now >= ratingDeadline(trip)) return true;
   return data.ratings.some((entry) => entry.tripId === rating.tripId &&
      entry.fromId === rating.toId && entry.toId === rating.fromId && !entry.deleted);
}

export function visibleDriverRatings(driverId, now = Date.now()) {
   return data.ratings.filter((rating) => rating.toId === driverId && isRatingPublished(rating, now));
}

function bookingStatus(booking, trip, departure, now) {
   if (!activeStatuses.includes(booking.status)) return booking.status;
   if (tripEnded(trip)) return trip.status === "removed" ? "removed" : "trip_cancelled";
   if (departure <= now) return booking.status === "pending" ? "expired" : "waiting";
   return booking.status;
}

function MyRides() {
   const [limit, setLimit] = useState(pageSize);
   const [selected, setSelected] = useState(null);
   const [message, setMessage] = useState("");
   const params = useSearchParams()[0];
   const showPast = params.get("tab") === "past";
   const user = data.users.find((entry) => entry.id === data.session.userId);

   const canView = user && user.verified && user.status !== "suspended";
   const now = Date.now();
   useEffect(() => setMessage(""), [showPast]);
   useEffect(() => {
      if (canView) expireRideRequests(user.id, now);
   });

   if (!canView) {
      let message = "Sign in to view your rides.";
      if (user && !user.verified) message = "Verify your email before viewing your rides.";
      if (user && user.status === "suspended") message = "Your account is suspended.";
      return <>
         <NavBar />
         <main className="rider-rides-page">
            <h1>My Rides</h1>
            <p>{message}</p>
            {!user && <Link to="/account/sign-in">Sign in</Link>}
         </main>
      </>;
   }

   const bookings = data.bookings.filter((booking) => booking.riderId === user.id);
   const rides = bookings.map((booking) => {
      const trip = data.trips.find((entry) => entry.id === booking.tripId);
      const departure = trip ? new Date(trip.departure).getTime() : NaN;
      const status = bookingStatus(booking, trip, departure, now);
      return { booking, trip, departure, status };
   });
   const upcoming = rides.filter((ride) => activeStatuses.includes(ride.status) && ride.departure > now);
   const past = rides.filter((ride) => !upcoming.includes(ride));
   const credits = rideCredits(user.id);

   const list = (showPast ? past : upcoming).sort((first, second) => {
      if (!first.trip) return second.trip ? 1 : 0;
      if (!second.trip) return -1;
      return showPast ? second.departure - first.departure : first.departure - second.departure;
   });
   const visible = showPast ? list.slice(0, limit) : list;
   const selectedTrip = selected && selected.trip;

   function beginCancel(ride) {
      setMessage("");
      setSelected(ride);
   }

   return (
      <>
         <div inert={Boolean(selectedTrip)}><NavBar /></div>
         <main className="rider-rides-page" inert={Boolean(selectedTrip)}>
            <h1>My Rides</h1>
            {message && <p className="rider-rides-message" role="status">{message}</p>}
            <section className="rider-rides-card rider-rides-row" aria-label="Ride credits">
               <div>Available credits <strong>{credits.available}</strong></div>
               <div>Held credits <strong>{credits.held}</strong></div>
               <Link to="/rider/credits">History</Link>
            </section>
            {credits.available <= 0 && <section className="rider-rides-card rider-rides-credit-prompt">
                  <h2>You’re out of ride credits</h2>
                  <p>You can’t request seats until you have an available credit. Offer a seat on a trip you already make: you earn 1 credit for each rider who travels with you.</p>
                  {user.vehicleStatus === "approved" && <Link className="rider-rides-button" to="/driver/post">Offer a seat</Link>}
            </section>}
            <nav className="rider-rides-row rider-rides-tabs" aria-label="Ride history">
               <Link to="/rider/rides" aria-current={!showPast ? "page" : undefined}>Upcoming ({upcoming.length})</Link>
               <Link to="/rider/rides?tab=past" aria-current={showPast ? "page" : undefined}>Past</Link>
            </nav>
            {!visible.length && <section className="rider-rides-card">
               <h2>{showPast ? "No past rides yet" : "No upcoming rides"}</h2>
               {!showPast && <Link to="/rider">Find a ride</Link>}
            </section>}
            {visible.map((ride) => {
               const booking = ride.booking;
               const trip = ride.trip;
               const status = ride.status;
               const driver = trip && data.users.find((entry) => entry.id === trip.driverId);
               const rating = trip && data.ratings.find((entry) =>
                  entry.tripId === trip.id && entry.fromId === user.id && entry.toId === trip.driverId
               );
               const waitlisted = status === "pending" && trip && trip.status === "full";
               const ratingCloses = ratingDeadline(trip);
               const canRate = trip && trip.status === "completed" && now < ratingCloses;
               return <article className="rider-rides-card" key={booking.id}>
                  <div className="rider-rides-row">
                     <strong>{waitlisted ? "Waitlisted" : statusLabels[status] || status}</strong>
                     {booking.late && <span>Late cancellation</span>}
                     {(activeStatuses.includes(status) || status === "waiting") && <span>1 credit held</span>}
                     {["completed", "no_show"].includes(status) && <span>1 credit spent</span>}
                     {["cancelled", "declined", "expired", "trip_cancelled", "removed"].includes(status) && <span>Credit released</span>}
                  </div>
                  {trip ? (
                     <>
                        <h2><Link to={"/rider/trip/" + trip.id}>
                           {trip.origin} → {trip.destination}{driver && " · " + driver.name}
                        </Link></h2>
                        <p>{formatDeparture(trip.departure)}</p>
                        <p>Pickup: {trip.pickup}</p>
                        {waitlisted && <p>The trip is full. You’ll be notified if a seat opens; the request expires at departure if it is not accepted.</p>}
                        {status === "cancelled" && (
                           <p>You cancelled {booking.cancelledAt
                              ? timeLeft(ride.departure - new Date(booking.cancelledAt)) + " "
                              : ""}before departure. Credit released.</p>
                        )}
                        {status === "declined" && <p>Driver’s reason: {booking.declineReason || "No reason given."}</p>}
                        {status === "expired" && <p>Not accepted before departure. Credit released.</p>}
                        <div className="rider-rides-row">
                           {!showPast && <button className="rider-rides-cancel" type="button" onClick={() => beginCancel(ride)}>
                              {status === "accepted" ? "Cancel seat" : "Cancel request"}
                           </button>}
                           {status === "accepted" && !showPast &&
                              <Link to={"/account/messages/" + trip.id}>Message driver</Link>}
                           {status === "completed" && !rating && canRate && (
                              <>
                                 <Link to={"/rider/rate/" + booking.id}>Rate driver</Link>
                                 <span>Rating closes {formatRatingDate(ratingCloses)}</span>
                              </>
                           )}
                           {status === "completed" && !rating && !canRate && <span>Rating closed</span>}
                           {status === "completed" && rating &&
                              <span>{rating.deleted ? "Rating submitted" : "Rated ★ " + rating.stars}</span>}
                           {status === "no_show" && <Link to={reportLink(trip)}>Report a problem</Link>}
                        </div>
                     </>
                  ) : <p>Trip details are unavailable.</p>}
               </article>;
            })}
            {showPast && list.length > 0 && <div className="rider-rides-row">
               <span>Showing {visible.length} of {list.length}</span>
               {visible.length < list.length &&
                  <button className="rider-rides-button" type="button" onClick={() => setLimit(limit + pageSize)}>Load more</button>}
            </div>}
         </main>
         {selectedTrip && <CancelRideDialog booking={selected.booking} trip={selectedTrip} user={user}
            onClose={() => setSelected(null)} onFinish={(result) => {
               setSelected(null);
               setMessage(result);
            }} />}
      </>
   );
}

export default MyRides;
