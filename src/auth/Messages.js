import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import names from "./names";
import formatDate from "./dates";
import today from "./today";
import "./SignIn.css";
import "./SignUp.css";
import "./CheckInbox.css";
import "./Report.css";
import "./Messages.css";

function Messages() {
   const { tripId } = useParams();
   const [searchParams] = useSearchParams();
   const [text, setText] = useState("");
   const [error, setError] = useState("");
   const [failNext, setFailNext] = useState(false);
   const [notSent, setNotSent] = useState(false);

   if (!data.session.userId) {
      return (
         <div className="auth-card">
            <h1>Sign in to see your messages</h1>
            <p className="auth-muted">Trip messages are only available to signed-in KFUPM members.</p>
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   const myId = data.session.userId;
   const trip = data.trips.find(t => t.id === tripId);

   function isAccepted(userId) {
      return data.bookings.find(b => b.tripId === tripId && b.riderId === userId &&
         (b.status === "accepted" || b.status === "completed")) !== undefined;
   }

   let otherId = "";
   if (trip && trip.driverId === myId) {
      otherId = searchParams.get("with");
   } else if (trip && isAccepted(myId)) {
      otherId = trip.driverId;
   }
   const other = data.users.find(u => u.id === otherId);

   if (!trip || !other || (trip.driverId === myId && !isAccepted(other.id))) {
      return (
         <div>
            <NavBar />
            <div className="auth-card">
               <h1>Thread not available</h1>
               <p className="auth-muted">Messages are only between a trip’s driver and its accepted riders.</p>
               <Link className="auth-link-button" to="/account">Back to my account</Link>
            </div>
         </div>
      );
   }

   const closed = Date.now() > new Date(trip.departure).getTime() + 24 * 60 * 60 * 1000;
   const backLink = trip.driverId === myId ? "/driver/trips/" + trip.id : "/rider/trip/" + trip.id;
   const shortName = names.getShortName(other.name);
   const firstName = other.name.split(" ")[0];

   const thread = data.messages.filter(m => m.tripId === trip.id &&
      ((m.fromId === myId && m.toId === other.id) || (m.fromId === other.id && m.toId === myId)));

   function handleChange(event) {
      setText(event.target.value);
   }

   function handleSubmit(event) {
      event.preventDefault();
      const message = text.trim();

      if (message.length === 0) {
         setError("Write a message before sending.");
         return;
      }
      if (message.length > 500) {
         setError("Messages can be up to 500 characters (" + message.length + "/500).");
         return;
      }
      setError("");

      if (failNext) {
         setFailNext(false);
         setNotSent(true);
         return;
      }

      data.messages.push({
         id: "m" + (data.messages.length + 1),
         tripId: trip.id,
         fromId: myId,
         toId: other.id,
         text: message,
         date: today()
      });
      setNotSent(false);
      setText("");
   }

   return (
      <div>
         <NavBar />
         <div className="auth-card">
            <div className="msg-header">
               <p className="msg-avatar">{names.getInitials(other.name)}</p>
               <div className="msg-title">
                  <h2>{shortName}</h2>
                  <p className="auth-muted">
                     {formatDate(trip.departure)} · {trip.departure.substring(11, 16)} · {trip.origin} → {trip.destination}
                  </p>
               </div>
               <Link className="msg-close" to={backLink}>Close</Link>
            </div>

            <div className="msg-list">
               {thread.length === 0 && <p className="auth-muted">No messages yet.</p>}
               {thread.map(m => (
                  <div key={m.id} className={m.fromId === myId ? "msg-row mine" : "msg-row"}>
                     <p className="msg-bubble">{m.text}</p>
                  </div>
               ))}
            </div>

            <p className="auth-hint">
               Only you and {firstName} can see this thread. Phone numbers and email addresses are never shared. The thread closes 24 hours after departure.
            </p>

            {closed ? (
               <p className="auth-info">This thread closed 24 hours after departure. You can still read the messages.</p>
            ) : (
               <form className="msg-form" onSubmit={handleSubmit} noValidate>
                  {notSent && <p className="auth-alert" role="alert">Message not sent. Check your connection and try again.</p>}

                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows="3" placeholder="Write a message…"
                     value={text} onChange={handleChange}></textarea>
                  {error ?
                     <p className="auth-error">{error}</p> :
                     <p className="auth-hint">{text.trim().length}/500</p>}

                  <input type="submit" value="Send" />

                  <p className="auth-demo">
                     Prototype: <button type="button" className="msg-simulate"
                        onClick={() => setFailNext(true)}>Simulate: next message fails to send</button>
                     {failNext && " (on)"}
                  </p>
               </form>
            )}
         </div>
      </div>
   );
}

export default Messages;