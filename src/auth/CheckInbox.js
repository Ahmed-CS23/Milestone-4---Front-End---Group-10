import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import "./SignIn.css";
import "./SignUp.css";
import "./CheckInbox.css";

function CheckInbox() {
   const [searchParams] = useSearchParams();
   const [message, setMessage] = useState("");
   const [messageClass, setMessageClass] = useState("");

   const email = searchParams.get("email") || "";
   const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());

   if (!user) {
      return (
         <div className="auth-card">
            <h1>Account not found</h1>
            <p className="auth-alert">No account was found for this email address.</p>
            <Link className="auth-link-button" to="/account/sign-up">Create an account</Link>
         </div>
      );
   }

   let result = "success";
   if (user.verified) {
      result = "used";
   }
   else if (!user.verifySentAt || Date.now() - user.verifySentAt >= 24 * 60 * 60 * 1000) {
      result = "expired";
   }

   function handleVerifyClick() {
      if (!user.verified && result === "success") {
         const now = new Date();
         let month = now.getMonth() + 1;
         let day = now.getDate();
         if (month < 10) {
            month = "0" + month;
         }
         if (day < 10) {
            day = "0" + day;
         }
         user.verified = true;
         data.credits.push({
            id: "c" + Date.now(),
            userId: user.id,
            type: "starting",
            amount: 2,
            label: "Starting credits",
            date: now.getFullYear() + "-" + month + "-" + day
         });
      }
   }

   function handleResend() {
      const secondsPassed = Math.floor((Date.now() - user.verifySentAt) / 1000);
      if (secondsPassed < 60) {
         setMessage("You can resend the link in " + (60 - secondsPassed) + " seconds.");
         setMessageClass("auth-alert");
         return;
      }
      user.verifySentAt = Date.now();
      setMessage("A new link was sent. Open the newest link within 24 hours.");
      setMessageClass("auth-success");
   }

   return (
      <div className="auth-card">
         {message && (
            <p className={messageClass} role={messageClass === "auth-alert" ? "alert" : "status"}>{message}</p>
         )}

         <p className="auth-icon" aria-hidden="true">✉</p>
         <h1>Check your inbox</h1>
         <p>We sent a verification link to <strong>{email}</strong>. The link works once and expires in 24 hours.</p>

         {user.verified ?
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link> :
            <button type="button" className="auth-secondary-button" onClick={handleResend}>
               Resend verification link
            </button>}

         <p className="auth-center">
            <Link to="/account/sign-up">Use a different email address</Link>
         </p>

         {user.vehicleStatus === "pending" && (
            <p className="auth-info">Your vehicle will be reviewed by an administrator after you verify your email.</p>
         )}

         <p className="auth-demo">
            Prototype: no email is sent. <Link to={"/account/verify?email=" + user.email + "&result=" + result}
               onClick={handleVerifyClick}>Open the verification link</Link>
         </p>
      </div>
   );
}

export default CheckInbox;