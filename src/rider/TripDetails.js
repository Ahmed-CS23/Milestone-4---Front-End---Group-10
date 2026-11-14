import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import { CancelRideDialog, formatDeparture, heldBookings, reportLink, rideCredits, tripEnded } from "./MyRides";
import "./TripDetails.css";

const noteLimit = 200;
const timeFormat = { hour: "numeric", minute: "2-digit", hour12: true };
const longDate = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
const shortDate = { weekday: "short", day: "numeric", month: "short" };
const noLongerOpen = "This trip is no longer open for requests.";

function tripBlock(trip, now) {
   if (trip.status === "cancelled") return "This trip was cancelled by the driver.";
   if (trip.status === "removed") return "This trip was removed by an administrator.";
   if (trip.status === "completed") return "This trip has been completed.";
   if (trip.status === "expired" || new Date(trip.departure).getTime() <= now) return "This trip has already departed.";
   if (trip.status === "full" || trip.seatsLeft <= 0) return "This trip is full.";
   if (trip.status !== "open") return "This trip is no longer available.";
   return "";
}

function TripDetails() {
   const tripId = useParams().tripId;
   const location = useLocation();
   const [dialog, setDialog] = useState("");
   const [note, setNote] = useState("");
   const [error, setError] = useState(null);
   const [confirmation, setConfirmation] = useState("");
   const user = data.users.find((entry) => entry.id === data.session.userId);
   const trip = data.trips.find((entry) => entry.id === tripId);
   let accessMessage = "";
   if (!user) accessMessage = "Sign in to view this trip.";
   else if (user.status === "suspended") accessMessage = "Your account is suspended.";
   else if (!user.verified) accessMessage = "Verify your email before viewing this trip.";

   if (accessMessage || !trip) {
      return <>
         <NavBar />
         <main className="rider-trip-page">
            <h1>Trip details</h1>
            <p>{accessMessage || "Trip not found."}</p>
            {!user ? <Link to="/account/sign-in">Sign in</Link> : <Link to="/rider">Find a ride</Link>}
         </main>
      </>;
   }

   const now = Date.now();
   const departure = new Date(trip.departure);
   const time = departure.toLocaleTimeString("en-US", timeFormat);
   const day = departure.toLocaleDateString("en-GB", shortDate).replace(",", "");
   const requestOpen = dialog === "request";
   const departed = departure.getTime() <= now;
   const driver = data.users.find((entry) => entry.id === trip.driverId);
   const driverName = driver ? driver.name : "the driver";
   const ownTrip = user.id === trip.driverId;
   const bookings = heldBookings(user.id, now);
   const active = bookings.find((booking) => booking.tripId === trip.id);
   const credits = rideCredits(user.id, bookings);
   const blocked = tripBlock(trip, now);
   const seatCount = trip.seatsLeft + (trip.seatsLeft === 1 ? " seat left" : " seats left");
   const full = trip.status === "full" || trip.seatsLeft <= 0;
   const noteLength = note.length;
   const noteError = noteLength > noteLimit ? "Note must be 200 characters or fewer (" + noteLength + "/200)." : "";
   const routeSearch = { from: trip.origin, to: trip.destination, date: trip.departure.split("T")[0],
      after: "00:00", before: "23:59" };
   const backSearch = location.state && location.state.search;
   const resultsLink = "/rider?" + new URLSearchParams(backSearch || routeSearch).toString();
   const alertLink = "/rider?" + new URLSearchParams({ ...routeSearch, alert: "1" }).toString();

   if (tripEnded(trip) && !dialog) {
      const cancelled = trip.status === "cancelled";
      return <>
         <NavBar />
         <main className="rider-trip-page">
            <h1>{cancelled ? "This trip was cancelled" : "This trip is no longer available"}</h1>
            <p>{cancelled
               ? "The driver cancelled the " + time + " trip on " + day + ". If you had a request or a seat, its held credit was released."
               : "An administrator removed this trip. Any credit held for it was released."}</p>
            <div className="rider-trip-row">
               {cancelled && <Link className="rider-trip-primary" to="/rider">Find another trip</Link>}
               <Link to="/rider">Back to the board</Link>
            </div>
         </main>
      </>;
   }

   const ratings = data.ratings.filter((rating) => rating.toId === trip.driverId && !rating.deleted);
   let stars = 0;
   for (const rating of ratings) stars += rating.stars;
   const completedTrips = data.trips.filter((entry) =>
      entry.driverId === trip.driverId && entry.status === "completed"
   ).length;


   function sendRequest(event) {
      event.preventDefault();
      const timestamp = Date.now();
      const currentBookings = heldBookings(user.id, timestamp);
      const currentTrip = data.trips.find((entry) => entry.id === trip.id);
      const available = rideCredits(user.id, currentBookings).available;
      const conflict = currentBookings.find((booking) => {
         if (booking.status !== "accepted" || booking.tripId === trip.id) return false;
         const other = data.trips.find((entry) => entry.id === booking.tripId);
         return other && Math.abs(new Date(other.departure) - departure) < 60 * 60000;
      });

      if (data.session.userId !== user.id || !user.verified || user.status === "suspended" || ownTrip) {
         setError({ text: "Your account cannot send this request." });
      } else if (currentBookings.some((booking) => booking.tripId === trip.id)) {
         setError({ type: "duplicate", text: "You already have a pending request on this trip. No new credit was held." });
      } else if (!currentTrip || !["open", "full"].includes(currentTrip.status) || new Date(currentTrip.departure).getTime() <= timestamp) {
         setError({ text: noLongerOpen });
      } else if (currentTrip.status === "full" || currentTrip.seatsLeft <= 0) {
         setError({ type: "full", text: "This trip just became full, so your request wasn’t sent and no credit was held." });
      } else if (available < 1) {
         setError({ type: "credits", text: "You need 1 available credit to request a seat. No credit was held." });
      } else if (conflict) {
         const other = data.trips.find((entry) => entry.id === conflict.tripId);
         setError({ type: "conflict", text: "You already have an accepted seat on a trip departing within 60 minutes of this one (" +
            formatDeparture(other.departure) + "). Cancel that seat first or choose another time." });
      } else if (!noteError) {
         saveRequest(timestamp);
      }
   }

   function saveRequest(timestamp) {
      const id = timestamp + "-" + user.id + "-" + trip.id;
      const date = new Date(timestamp).toISOString();
      // The driver changes seat inventory only when accepting the request.
      data.bookings.push({ id: "b" + id, tripId: trip.id, riderId: user.id,
         status: "pending", note: note.trim(), late: false });
      data.credits.push({ id: "c" + id, userId: user.id, type: "held", amount: -1,
         label: "Request · " + trip.origin + " → " + trip.destination, date });
      data.notifications.push({ id: "n" + id, userId: trip.driverId, read: false, date,
         text: user.name + " requested a seat on your trip.", link: "/driver/trips/" + trip.id });
      const recipient = driverName.endsWith(".") ? driverName : driverName + ".";
      setConfirmation("Request sent to " + recipient + " 1 credit is now held.");
      setDialog("");
      setNote("");
      setError(null);
   }

   return <>
      <div inert={Boolean(dialog)}><NavBar /></div>
      <main className="rider-trip-page" inert={Boolean(dialog)}>
         <Link to={backSearch ? resultsLink : "/rider"}>← Find a ride</Link>
         <h1>Trip details</h1>
         {confirmation && <p className="rider-trip-message" role="status">{confirmation}</p>}
         <section className="rider-trip-panel">
            <h2>{time} · {departure.toLocaleDateString("en-GB", longDate).replace(",", "")}</h2>
            <p>{trip.origin} → {trip.destination}</p>
            {!departed && ["open", "full"].includes(trip.status) &&
               <span className="rider-trip-badge">{trip.seatsLeft} of {trip.seats} {trip.seats === 1 ? "seat" : "seats"} left</span>}
            <div className="rider-trip-map"><span aria-hidden="true">📍</span> Pickup: {trip.pickup}</div>
            {trip.note && <p><strong>Driver’s note</strong> · {trip.note}</p>}
         </section>
         {driver && <section className="rider-trip-panel">
            <div className="rider-trip-row">
               <span className="rider-trip-avatar" aria-hidden="true">{driver.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</span>
               <h2>{driver.name}</h2>
               <Link to={"/account/profile/" + driver.id}>Profile</Link>
            </div>
            <p>{ratings.length ? "★ " + (stars / ratings.length).toFixed(1) : "No ratings yet"} · {completedTrips} completed trips</p>
            {driver.vehicle && <p>{driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.colour}</p>}
         </section>}
         {blocked && blocked !== "This trip is full." && <p className="rider-trip-message">{blocked}</p>}
         {ownTrip && <section className="rider-trip-panel rider-trip-info">
            <p>This is your trip. You can’t request a seat on it; manage requests and passengers instead.</p>
            <Link className="rider-trip-primary" to={"/driver/trips/" + trip.id}>Manage this trip</Link>
         </section>}
         {active && <section className="rider-trip-panel">
            <h2>{active.status === "accepted" ? (departed ? "Waiting for driver to complete" : "Seat accepted")
               : full ? "Waitlisted" : "Request pending"}</h2>
            {active.status === "pending" && <p>Waiting for {driverName} to respond. If there is no response before departure ({time}), the request expires and your credit is released.</p>}
            <div className="rider-trip-row">
               {!departed && ["open", "full"].includes(trip.status) &&
                  <button className="rider-rides-cancel" type="button" onClick={() => {
                     setConfirmation("");
                     setDialog(active);
                  }}>{active.status === "accepted" ? "Cancel seat" : "Cancel request"}</button>}
               <Link to="/rider/rides">Go to My Rides</Link>
               {active.status === "accepted" && !departed && <Link to={"/account/messages/" + trip.id}>Message driver</Link>}
            </div>
         </section>}
         {active && <section className="rider-trip-panel rider-trip-row" aria-label="Ride credits">
            <span>Available <strong>{credits.available}</strong></span>
            <span>Held <strong>{credits.held}</strong></span>
            <Link to="/rider/credits">History</Link>
         </section>}
         {!ownTrip && !active && blocked === "This trip is full." && <section className="rider-trip-panel rider-trip-info">
            <button className="rider-trip-primary" type="button" disabled>Trip full</button>
            <p>All seats are taken. Choose another trip or get notified when a matching trip is posted.</p>
            <Link to={alertLink}>Save an alert for this route</Link>
         </section>}
         {!ownTrip && !active && !blocked && <>
            {credits.available < 1 ? <section className="rider-trip-panel rider-trip-warning">
               <h2>Not enough credits</h2>
               <p>You have {credits.available} credits available ({credits.held} {credits.held === 1 ? "is" : "are"} held by your other bookings). Offer a seat as a driver to earn credits, or cancel a pending request.</p>
               <Link to={user.vehicleStatus === "approved" ? "/driver/post" : "/account"}>Offer a seat</Link>
            </section> : <p>Requesting holds 1 of your {credits.available} available credits until the driver responds.</p>}
            <button className="rider-trip-primary" type="button" disabled={credits.available < 1} onClick={() => {
               setError(null);
               setDialog("request");
            }}>Request a seat</button>
         </>}
         {!ownTrip && <Link to={reportLink(trip)}>Report this trip</Link>}
      </main>
      {dialog && !requestOpen && <CancelRideDialog booking={dialog} trip={trip} user={user}
         onClose={() => setDialog("")} onFinish={(result) => {
            setDialog("");
            setConfirmation(result);
         }} />}
      {requestOpen && <div className="rider-trip-overlay" onKeyDown={(event) => {
         if (event.key === "Escape") setDialog("");
      }}>
         <form className="rider-trip-panel rider-trip-dialog" role="dialog" aria-modal="true"
            aria-labelledby="rider-trip-request-title" onSubmit={sendRequest}>
            <h2 id="rider-trip-request-title">Request a seat</h2>
            <section className="rider-trip-panel">
               <p>{time} · {day} · {seatCount}</p>
               <p>{trip.origin} → {trip.destination} · {driverName}</p>
            </section>
            <section className="rider-trip-panel rider-trip-info">
               <strong>Credit hold</strong>
               <p>1 credit is held while your request is pending or accepted. It is released if the request is declined, cancelled or expires, and spent only when the trip is completed.</p>
            </section>
            <label htmlFor="rider-trip-note">Note to the driver (optional)</label>
            <textarea id="rider-trip-note" value={note} autoFocus aria-invalid={Boolean(noteError)}
               aria-describedby="rider-trip-note-count" onChange={(event) => setNote(event.target.value)} />
            <small id="rider-trip-note-count">Up to 200 characters · {noteLength}/200</small>
            {noteError && <p className="rider-trip-error" role="alert">{noteError}</p>}
            {error && <p className="rider-trip-error" role="alert">{error.text}</p>}
            <div className="rider-trip-row">
               {error && error.type === "duplicate" && <Link className="rider-trip-primary" to="/rider/rides">View my request</Link>}
               {error && error.type === "conflict" && <Link className="rider-trip-primary" to="/rider/rides">View My Rides</Link>}
               {error && error.type === "full" && <>
                  <Link to={resultsLink}>Back to results</Link>
                  <Link to={alertLink}>Save an alert for this route</Link>
               </>}
               {!error && <button className="rider-trip-primary" type="submit" disabled={Boolean(noteError)}>Send request</button>}
               <button type="button" onClick={() => setDialog("")}>Cancel</button>
            </div>
         </form>
      </div>}
   </>;
}

export default TripDetails;
