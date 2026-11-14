import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import { formatDeparture, formatRatingDate, ratingDeadline, reportLink } from "./MyRides";
import "./RateDriver.css";

const pastRides = "/rider/rides?tab=past";
const reviewLimit = 300;

function RateDriver() {
   const bookingId = useParams().bookingId;
   const [stars, setStars] = useState(0);
   const [review, setReview] = useState("");
   const [attempted, setAttempted] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [checkedAt, setCheckedAt] = useState(0);
   const user = data.users.find((entry) => entry.id === data.session.userId);
   const booking = data.bookings.find((entry) => entry.id === bookingId);
   const trip = booking && data.trips.find((entry) => entry.id === booking.tripId);
   const driver = trip && data.users.find((entry) => entry.id === trip.driverId);

   let accessMessage = "";
   if (!user) accessMessage = "Sign in to rate your trip.";
   else if (user.status === "suspended") accessMessage = "Your account is suspended.";
   else if (!user.verified) accessMessage = "Verify your email before rating your trip.";
   else if (!booking || booking.riderId !== user.id || booking.status !== "completed" ||
      !trip || trip.status !== "completed" || !driver || driver.id === user.id) {
      accessMessage = "Only completed rides you travelled on can be rated.";
   }

   if (accessMessage) return <>
      <NavBar />
      <main className="rider-rate-page">
         <h1>Rate your trip</h1>
         <p>{accessMessage}</p>
         {user ? <Link to={pastRides}>Back to My Rides</Link> : <Link to="/account/sign-in">Sign in</Link>}
      </main>
   </>;

   function findRating() {
      return data.ratings.find((rating) =>
         rating.tripId === trip.id && rating.fromId === user.id && rating.toId === driver.id
      );
   }

   const closes = ratingDeadline(trip);
   const isClosed = isNaN(closes) || Math.max(Date.now(), checkedAt) >= closes;
   const closeDate = isNaN(closes) ? "" : formatRatingDate(closes);
   const previousRating = findRating();
   const locked = isClosed || Boolean(previousRating);
   const shownStars = previousRating && !previousRating.deleted ? previousRating.stars : stars;
   const starsError = !locked && attempted && !stars ? "Select a rating from 1 to 5 stars." : "";
   const tooLong = review.length > reviewLimit;
   const reviewError = !locked && attempted && tooLong
      ? "Review must be 300 characters or fewer (" + review.length + "/" + reviewLimit + ")." : "";
   const errorCount = Number(Boolean(starsError)) + Number(Boolean(reviewError));

   function submitRating(event) {
      event.preventDefault();
      setAttempted(true);
      const now = Date.now();
      setCheckedAt(now);
      const deadline = ratingDeadline(trip);
      if (data.session.userId !== user.id || !user.verified || user.status === "suspended" ||
         booking.status !== "completed" || trip.status !== "completed" ||
         isNaN(deadline) || now >= deadline || findRating() ||
         stars < 1 || stars > 5 || tooLong) return;

      data.ratings.push({
         id: "r" + now + "-" + booking.id,
         tripId: trip.id, fromId: user.id, toId: driver.id, stars,
         review: review.trim(), date: new Date(now).toISOString(), flagged: false, deleted: false
      });
      setSubmitted(true);
   }

   return <>
      <NavBar />
      <main className="rider-rate-page">
         <Link to={pastRides}>← Back to My Rides</Link>
         <h1>Rate your trip</h1>
         <section className="rider-rate-card" aria-label="Trip summary">
            <strong>{formatDeparture(trip.departure)}</strong>
            <p>{trip.origin} → {trip.destination}</p>
            <p>Driver {driver.name}</p>
         </section>
         {submitted ? (
            <section className="rider-rate-card rider-rate-form" role="status">
               <h2>Rating submitted</h2>
               <p>Thanks! Your {stars}-star rating for {driver.name} will be published when the driver rates you or on {closeDate}.</p>
               <Link className="rider-rate-primary" to={pastRides}>Back to My Rides</Link>
            </section>
         ) : (
            <form className="rider-rate-form" onSubmit={submitRating} noValidate>
               {locked && <p className="rider-rate-card rider-rate-info">
                  {previousRating ? <strong>You already rated this trip.</strong> : <>
                     <strong>Rating closed:</strong>{" "}
                     {closeDate ? "The rating window for this trip closed on " + closeDate + ", 7 days after completion."
                        : "This trip has no rating deadline."}
                  </>}
               </p>}
               {errorCount > 0 && <p className="rider-rate-card rider-rate-error-banner" role="alert">
                  Fix {errorCount} {errorCount === 1 ? "field" : "fields"} to submit your rating.
               </p>}
               <fieldset className="rider-rate-card" disabled={locked}
                  aria-describedby={starsError ? "rider-rate-stars-error" : undefined}>
                  <legend>How was your trip? *</legend>
                  <div className="rider-rate-stars">
                     {[1, 2, 3, 4, 5].map((value) => (
                        <label key={value} className={value <= shownStars ? "rider-rate-star rider-rate-star-selected" : "rider-rate-star"}>
                           <input type="radio" name="stars" value={value} checked={shownStars === value}
                              onChange={() => setStars(value)} aria-label={value + (value === 1 ? " star" : " stars")} />
                           <span aria-hidden="true">★</span>
                        </label>
                     ))}
                  </div>
                  {starsError && <p id="rider-rate-stars-error" className="rider-rate-error" role="alert">{starsError}</p>}
               </fieldset>
               <label htmlFor="rider-rate-review">Review (optional)</label>
               <textarea id="rider-rate-review" value={review} disabled={locked} onChange={(event) => setReview(event.target.value)}
                  aria-invalid={Boolean(reviewError)} aria-describedby={reviewError ? "rider-rate-count rider-rate-review-error" : "rider-rate-count"}
                  placeholder="Write a short review" />
               <small id="rider-rate-count">Up to {reviewLimit} characters · {review.length}/{reviewLimit}</small>
               {reviewError && <p id="rider-rate-review-error" className="rider-rate-error" role="alert">{reviewError}</p>}
               {!locked && <p className="rider-rate-card rider-rate-info">
                  Your rating is shown once {driver.name} rates you too or the seven-day window closes on {closeDate}, so neither side can retaliate.
               </p>}
               <button className="rider-rate-primary" type="submit" disabled={locked}>Submit rating</button>
               <div className="rider-rate-links">
                  <Link to={reportLink(trip)}>Report a problem instead</Link>
                  <Link to={pastRides}>Not now</Link>
               </div>
            </form>
         )}
      </main>
   </>;
}

export default RateDriver;


