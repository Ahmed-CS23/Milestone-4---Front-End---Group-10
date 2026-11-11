import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import names from "./names";
import formatDate from "./dates";
import today from "./today";
import "./SignIn.css";
import "./SignUp.css";
import "./CheckInbox.css";
import "./Report.css";

const categories = [
   "Unsafe driving",
   "Did not show up or was very late",
   "Harassment or inappropriate behaviour",
   "Asked for money or payment",
   "Other"
];

function Report() {
   const [searchParams] = useSearchParams();
   const [inputs, setInputs] = useState({ category: "", details: "" });
   const [errors, setErrors] = useState({});
   const [message, setMessage] = useState("");
   const [submittedId, setSubmittedId] = useState("");

   if (!data.session.userId) {
      return (
         <div className="auth-card">
            <h1>Sign in to report a problem</h1>
            <p className="auth-muted">Reports are only accepted from signed-in KFUPM members.</p>
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   const subject = data.users.find(u => u.id === searchParams.get("subject") && u.role === "user");
   const trip = data.trips.find(t => t.id === searchParams.get("trip"));

   if (!subject) {
      return (
         <div>
            <NavBar />
            <div className="auth-card">
               <h1>User not found</h1>
               <p className="auth-muted">Open a report from another user’s profile or trip.</p>
               <Link className="auth-link-button" to="/account">Back to my account</Link>
            </div>
         </div>
      );
   }

   if (subject.id === data.session.userId) {
      return (
         <div>
            <NavBar />
            <div className="auth-card">
               <h1>You can’t report yourself</h1>
               <p className="auth-muted">Reports are for problems with other users.</p>
               <Link className="auth-link-button" to="/account">Back to my account</Link>
            </div>
         </div>
      );
   }

   function isOnTrip(t, id) {
      return t.driverId === id || data.bookings.find(b => b.tripId === t.id && b.riderId === id) !== undefined;
   }

   if (searchParams.get("trip") && (!trip || !isOnTrip(trip, data.session.userId) || !isOnTrip(trip, subject.id))) {
      return (
         <div>
            <NavBar />
            <div className="auth-card">
               <h1>Trip not found</h1>
               <p className="auth-muted">You can only link a trip that you and this user were both on.</p>
               <Link className="auth-link-button" to={"/account/profile/" + subject.id}>Back to profile</Link>
            </div>
         </div>
      );
   }

   const shortName = names.getShortName(subject.name);

   if (submittedId) {
      return (
         <div>
            <NavBar />
            <div className="auth-card">
               <p className="auth-icon">✓</p>
               <h1>Report submitted</h1>
               <p>Report {submittedId} was sent to the moderators. You’ll get a notification when it has been reviewed.</p>
               <Link className="auth-link-button" to={"/account/profile/" + subject.id}>Done</Link>
            </div>
         </div>
      );
   }

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function handleSubmit(event) {
      event.preventDefault();
      const details = inputs.details.trim();
      const newErrors = {};

      if (inputs.category === "") {
         newErrors.category = "Choose what happened.";
      }
      if (details.length < 10 || details.length > 500) {
         newErrors.details = "Describe what happened in 10–500 characters (" + details.length + "/500).";
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
         setMessage("Report not submitted");
         return;
      }

      const tripId = trip ? trip.id : null;
      const duplicate = data.reports.find(r => r.reporterId === data.session.userId &&
         r.subjectId === subject.id && r.tripId === tripId &&
         (r.status === "open" || r.status === "investigating"));
      if (duplicate) {
         setMessage("Report not submitted — you already have an open report about " + shortName +
            (trip ? " for this trip" : "") + ". An administrator will review it.");
         return;
      }

      const id = "R-" + (1000 + data.reports.length + 1);
      data.reports.push({
         id: id,
         reporterId: data.session.userId,
         subjectId: subject.id,
         tripId: tripId,
         category: inputs.category,
         details: details,
         status: "open",
         outcome: "",
         note: "",
         date: today()
      });
      setSubmittedId(id);
   }

   return (
      <div>
         <NavBar />
         <form className="auth-card" onSubmit={handleSubmit} noValidate>
            <h1>Report {shortName}</h1>

            {trip && (
               <p className="auth-muted">
                  Linked trip: {formatDate(trip.departure)} · {trip.origin} → {trip.destination}
               </p>
            )}

            {message && <p className="auth-alert">{message}</p>}

            <fieldset className="report-options">
               <legend>What happened? *</legend>
               {categories.map((c, i) => (
                  <div key={c} className="report-option">
                     <input type="radio" id={"cat-" + i} name="category" value={c}
                        checked={inputs.category === c} onChange={handleChange} />
                     <label htmlFor={"cat-" + i}>{c}</label>
                  </div>
               ))}
            </fieldset>
            {errors.category && <p className="auth-error">{errors.category}</p>}

            <label htmlFor="details">Details *</label>
            <textarea id="details" name="details" rows="5"
               value={inputs.details} onChange={handleChange}></textarea>
            {errors.details ?
               <p className="auth-error">{errors.details}</p> :
               <p className="auth-hint">10 to 500 characters · {inputs.details.trim().length}/500</p>}

            <p className="auth-info">An administrator reviews every report. In an emergency, call 911.</p>

            <input type="submit" value="Submit report" />
            <Link className="report-cancel" to={"/account/profile/" + subject.id}>Cancel</Link>
         </form>
      </div>
   );
}

export default Report;