import { Link } from "react-router-dom";
import NavBar from "../shared/NavBar";
import TopBar, { Banner } from "./DriverUI";
import "./Driver.css";

// Shown instead of a driver page when nobody is signed in, or the user has no approved vehicle (WF-30a).
function DriverGuard(props) {
   if (!props.user) {
      return (
         <div className="driver-card">
            <div className="driver-result">
               <p className="driver-result-icon" aria-hidden="true">🚗</p>
               <h2>Sign in to drive</h2>
               <p className="driver-muted">Driver pages are only for signed-in KFUPM members.</p>
            </div>
            <Link className="driver-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="Drive" />
            <div className="driver-result">
               <p className="driver-result-icon" aria-hidden="true">🚗</p>
               <h2>Offer seats on trips you already make</h2>
               <p className="driver-muted">Register your vehicle to post trips. An administrator reviews it first.
                  You earn 1 ride credit for every rider who travels with you — no money changes hands.</p>
            </div>
            {props.user.vehicleStatus === "pending" && (
               <Banner type="info" title="Vehicle under review">
                  <p>An administrator is checking your vehicle. You can post trips once it is approved.</p>
               </Banner>
            )}
            {props.user.vehicleStatus === "rejected" && (
               <Banner type="error" title="Vehicle not approved">
                  <p>{props.user.rejectReason || "Update your vehicle details and resubmit."}</p>
               </Banner>
            )}
            <Link className="driver-button" to="/account">
               {props.user.vehicleStatus === "none" ? "Register a vehicle" : "Go to my vehicle"}
            </Link>
            <Link className="driver-secondary" to="/rider">Find a ride instead</Link>
         </div>
      </div>
   );
}

// Any other account opening a driver's trip (WF-06, FR-D6 step 3).
function NoAccess() {
   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="My trip" back="/driver/trips" />
            <div className="driver-result">
               <p className="driver-result-icon" aria-hidden="true">⚠</p>
               <h2>You don’t have access to this page</h2>
               <p className="driver-muted">Only the trip’s own driver can open it.</p>
            </div>
            <Link className="driver-button" to="/driver/trips">Back to My Trips</Link>
         </div>
      </div>
   );
}

function TripNotFound() {
   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="My trip" back="/driver/trips" />
            <div className="driver-result">
               <h2>Trip not found</h2>
               <p className="driver-muted">This trip doesn’t exist or was removed.</p>
            </div>
            <Link className="driver-button" to="/driver/trips">Back to My Trips</Link>
         </div>
      </div>
   );
}

export { NoAccess, TripNotFound };
export default DriverGuard;
