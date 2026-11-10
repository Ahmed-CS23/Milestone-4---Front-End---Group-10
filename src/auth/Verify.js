import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import "./SignIn.css";
import "./CheckInbox.css";

function Verify() {
   const [searchParams] = useSearchParams();
   const email = searchParams.get("email");
   const result = searchParams.get("result");
   const user = data.users.find(u => u.email === email);

   function handleSendNew() {
      user.verifySentAt = Date.now();
   }

   if (user && result === "success" && user.verified) {
      return (
         <div className="auth-card">
            <h1>Email verified</h1>
            <p>You can now find rides. We added <strong>2 starting credits</strong> to your account.</p>
            {user.vehicleStatus === "pending" && (
               <p className="auth-muted">Your vehicle is pending review. You can offer seats once an administrator approves it.</p>
            )}
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   if (user && result === "expired") {
      return (
         <div className="auth-card">
            <p className="auth-icon">⏰</p>
            <h1>This link has expired</h1>
            <p className="auth-muted">Verification links expire after 24 hours.</p>
            <Link className="auth-link-button" to={"/account/check-inbox?email=" + email}
               onClick={handleSendNew}>Send a new link</Link>
            <p className="auth-center">
               <Link to="/account/sign-in">Back to sign in</Link>
            </p>
         </div>
      );
   }

   return (
      <div className="auth-card">
         <p className="auth-icon">⚠</p>
         <h1>This link can’t be used</h1>
         <p className="auth-muted">The link is invalid or has already been used.</p>
         <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
      </div>
   );
}

export default Verify;