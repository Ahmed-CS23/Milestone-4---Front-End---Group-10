import { Link, useParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import names from "./names";
import "./SignIn.css";
import "./SignUp.css";
import "./Account.css";
import "./Profile.css";

function Profile() {
   const { userId } = useParams();
   const person = data.users.find(u => u.id === userId && u.role === "user");

   if (!data.session.userId) {
      return (
         <div className="auth-card">
            <h1>Sign in to view profiles</h1>
            <p className="auth-muted">Profiles are only visible to signed-in KFUPM members.</p>
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   if (!person) {
      return (
         <div>
            <NavBar />
            <div className="auth-card">
               <h1>Profile not found</h1>
               <p className="auth-muted">This user doesn’t exist or is no longer available.</p>
               <Link className="auth-link-button" to="/rider">Find a ride</Link>
            </div>
         </div>
      );
   }

   const ratings = data.ratings.filter(r => r.toId === person.id && !r.deleted);
   ratings.sort((a, b) => (a.date < b.date ? 1 : -1));
   let total = 0;
   for (let i = 0; i < ratings.length; i++) {
      total = total + ratings[i].stars;
   }
   let average = "–";
   if (ratings.length > 0) {
      average = Math.round((total / ratings.length) * 10) / 10;
   }

   const tripsDriven = data.trips.filter(t => t.driverId === person.id && t.status === "completed").length;
   const tripsRidden = data.bookings.filter(b => b.riderId === person.id && b.status === "completed").length;
   const lateCancellations = data.bookings.filter(b => b.riderId === person.id &&
      b.status === "cancelled" && b.late).length;

   let roleText = "Rider";
   if (person.vehicleStatus === "approved") {
      roleText = "Driver and rider";
   }

   function reviewerRole(rating) {
      const trip = data.trips.find(t => t.id === rating.tripId);
      if (trip && trip.driverId === rating.fromId) {
         return "Driver";
      }
      return "Rider";
   }

   function formatDate(text) {
      if (!text) {
         return "";
      }
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const pieces = text.split("-");
      return Number(pieces[2]) + " " + months[Number(pieces[1]) - 1] + " " + pieces[0];
   }

   const isMe = person.id === data.session.userId;

   return (
      <div>
         <NavBar />
         <div className="auth-card">
            <h1>Profile</h1>

            <div className="account-box account-header">
               <p className="account-avatar">{names.getInitials(person.name)}</p>
               <div>
                  <p className="account-name">{names.getShortName(person.name)}</p>
                  <p className="auth-muted account-left">{roleText}</p>
               </div>
            </div>

            <div className="account-box account-row">
               <div>
                  <p className="auth-hint">Rating</p>
                  <p className="account-number">{average}</p>
                  <p className="auth-hint">{ratings.length} {ratings.length === 1 ? "rating" : "ratings"}</p>
               </div>
               <div>
                  <p className="auth-hint">Completed trips</p>
                  <p className="account-number">{tripsDriven + tripsRidden}</p>
               </div>
               <div>
                  <p className="auth-hint">Late cancellations</p>
                  <p className="account-number">{lateCancellations}</p>
               </div>
            </div>

            {person.vehicleStatus === "approved" && person.vehicle && (
               <div className="account-box">
                  <h2>Vehicle</h2>
                  <p className="account-left">{person.vehicle.make} {person.vehicle.model} · {person.vehicle.colour}</p>
                  <p className="auth-hint">Plates are never shown to other users.</p>
               </div>
            )}

            {ratings.length > 0 && (
               <div className="account-box">
                  <h2>{roleText === "Rider" ? "Reviews from drivers" : "Reviews"}</h2>
                  {ratings.map(r => (
                     <div key={r.id} className="profile-review">
                        <p>★ {r.stars} · {reviewerRole(r)} · {formatDate(r.date)}</p>
                        {r.review && <p className="auth-muted account-left">“{r.review}”</p>}
                     </div>
                  ))}
               </div>
            )}

            <p className="auth-hint">Only coordination details are shown. Email, plate and schedule stay private.</p>

            {isMe ?
               <Link className="auth-center" to="/account">Back to my account</Link> :
               <Link className="profile-report" to={"/account/report?subject=" + person.id}>Report this user</Link>}
         </div>
      </div>
   );
}

export default Profile;