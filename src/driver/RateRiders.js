import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard, { NoAccess, TripNotFound } from "./DriverGuard";
import TopBar, { Pill, Avatar, Banner, FieldError } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./RateRiders.css";

// WF-41 · Rate riders, WF-41a validation, WF-41b window closed, WF-41c submitted (FR-D8)
function RateRiders() {
   const { tripId } = useParams();
   const [stars, setStars] = useState({});
   const [reviews, setReviews] = useState({});
   const [missing, setMissing] = useState([]);
   const [submitted, setSubmitted] = useState(false);

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

   if (trip.status !== "completed") {
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Rate riders" back={"/driver/trips/" + trip.id} />
               <Banner type="info" title="Not ready for ratings">
                  <p>You can rate riders after you mark the trip as completed.</p>
               </Banner>
               <Link className="driver-button" to={"/driver/trips/" + trip.id}>Back to the trip</Link>
            </div>
         </div>
      );
   }

   // WF-41c
   if (submitted) {
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Rate riders" back="/driver/trips?tab=past" />
               <div className="driver-result">
                  <p className="driver-result-icon" aria-hidden="true">✓</p>
                  <h2>Ratings submitted</h2>
                  <p className="driver-muted">Thank you. Your ratings will be published when the riders rate you too, or when the 7-day window closes.</p>
               </div>
               <Link className="driver-button" to="/driver/trips?tab=past">Back to My Trips</Link>
            </div>
         </div>
      );
   }

   const completedAt = new Date(trip.completedAt || trip.departure);
   const closesAt = new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
   const windowClosed = Date.now() > closesAt.getTime();
   const travelled = utils.getBookings(trip.id, "completed");
   const noShows = utils.getBookings(trip.id, "no_show");

   function alreadyRated(riderId) {
      return data.ratings.find(r => r.tripId === trip.id && r.fromId === user.id && r.toId === riderId && !r.deleted);
   }

   const toRate = travelled.filter(b => !alreadyRated(b.riderId));

   // FR-D8 step 3: rating 1–5 required, review ≤ 300 characters, one rating per rider per trip, within 7 days.
   function handleSubmit() {
      if (windowClosed) {
         return;
      }
      const notRated = toRate.filter(b => !stars[b.riderId]);
      const tooLong = toRate.filter(b => (reviews[b.riderId] || "").length > 300);
      if (notRated.length > 0 || tooLong.length > 0) {
         setMissing(notRated.map(b => b.riderId).concat(tooLong.map(b => b.riderId)));
         return;
      }
      const today = utils.toInputValue(new Date()).substring(0, 10);
      for (let i = 0; i < toRate.length; i++) {
         data.ratings.push({
            id: utils.newId("r"),
            tripId: trip.id,
            fromId: user.id,
            toId: toRate[i].riderId,
            stars: stars[toRate[i].riderId],
            review: (reviews[toRate[i].riderId] || "").trim(),
            date: today,
            flagged: false,
            deleted: false
         });
      }
      setSubmitted(true);
   }

   const missingNames = toRate.filter(b => missing.indexOf(b.riderId) !== -1 && !stars[b.riderId])
      .map(b => utils.getUserName(b.riderId));

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="Rate riders" back={"/driver/trips/" + trip.id} />

            {missingNames.length > 0 && (
               <Banner type="error" title="Ratings not submitted">
                  <p>Select a rating for {missingNames.join(" and ")} before submitting.</p>
               </Banner>
            )}

            <div className="driver-summary">
               <p className="driver-strong">{utils.formatDeparture(trip.departure)}</p>
               <p className="driver-hint">{trip.origin} → {trip.destination}</p>
            </div>

            {windowClosed ? (
               <Banner type="info" title="Rating closed">
                  <p>The rating window closed on {utils.formatDeadline(closesAt).split(",")[0]}, 7 days after completion. Ratings you submitted earlier are unchanged.</p>
               </Banner>
            ) : (
               <Banner type="info">
                  <p>Ratings are published when the rider has rated you too, or when the window closes on {utils.formatDeadline(closesAt).split(",")[0]} (7 days after completion).</p>
               </Banner>
            )}

            {travelled.map(b => {
               const name = utils.getUserName(b.riderId);
               const rated = alreadyRated(b.riderId);
               const value = rated ? rated.stars : (stars[b.riderId] || 0);
               const review = rated ? rated.review : (reviews[b.riderId] || "");
               const locked = windowClosed || !!rated;
               const showError = missing.indexOf(b.riderId) !== -1;
               return (
                  <div key={b.id} className="driver-box">
                     <div className="driver-person-row">
                        <Avatar name={name} />
                        <span className="driver-strong">{name}</span>
                        {rated && <Pill tone="green">Rated</Pill>}
                     </div>
                     <div className="driver-stars" role="radiogroup" aria-label={"Rating for " + name}>
                        {[1, 2, 3, 4, 5].map(n => (
                           <button type="button" key={n} role="radio" aria-checked={value === n}
                              aria-label={n + (n === 1 ? " star" : " stars")} disabled={locked}
                              className={value >= n ? "on" : ""}
                              onClick={() => setStars(v => ({...v, [b.riderId]: n}))}>{value >= n ? "★" : "☆"}</button>
                        ))}
                     </div>
                     {showError && !stars[b.riderId] && <FieldError text="Select a rating from 1 to 5 stars." />}
                     <label htmlFor={"review-" + b.id}>Review (optional)</label>
                     <textarea id={"review-" + b.id} rows="3" placeholder="Write a short review" disabled={locked}
                        className={review.length > 300 ? "driver-invalid" : ""}
                        value={review} onChange={e => setReviews(v => ({...v, [b.riderId]: e.target.value}))} />
                     {review.length > 300 ?
                        <FieldError text="Keep the review to 300 characters or fewer." /> :
                        <p className="driver-hint">Up to 300 characters · {review.length}/300</p>}
                  </div>
               );
            })}

            {noShows.map(b => (
               <div key={b.id} className="driver-box">
                  <div className="driver-person-row">
                     <Avatar name={utils.getUserName(b.riderId)} />
                     <span className="driver-strong">{utils.getUserName(b.riderId)}</span>
                     <Pill tone="red">Did not travel</Pill>
                  </div>
                  <p className="driver-hint">Not rated — riders who did not travel can’t be rated.</p>
               </div>
            ))}

            {travelled.length === 0 && <p className="driver-hint driver-center">Nobody travelled on this trip, so there is no one to rate.</p>}

            {toRate.length > 0 && (
               <button type="button" className="driver-button" disabled={windowClosed} onClick={handleSubmit}>Submit ratings</button>
            )}
            <Link className="driver-center driver-strong" to={"/account/report?trip=" + trip.id}>Report a problem</Link>
         </div>
      </div>
   );
}

export default RateRiders;
