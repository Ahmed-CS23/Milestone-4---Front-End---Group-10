import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import "./SignIn.css";
import "./SignUp.css";
import "./Account.css";

function Account() {
   const [signedOut, setSignedOut] = useState(false);
   const [editing, setEditing] = useState(false);
   const [inputs, setInputs] = useState({ make: "", model: "", colour: "", plate: "", capacity: "" });
   const [errors, setErrors] = useState({});
   const [message, setMessage] = useState("");

   const user = data.users.find(u => u.id === data.session.userId);

   if (signedOut || !user) {
      return (
         <div className="auth-card">
            <h1>{signedOut ? "You signed out" : "You’re not signed in"}</h1>
            <p className="auth-muted">Sign in to see your account.</p>
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   let balance = 0;
   for (let i = 0; i < data.credits.length; i++) {
      const c = data.credits[i];
      if (c.userId === user.id && (c.type === "starting" || c.type === "earned" ||
         c.type === "spent" || c.type === "admin")) {
         balance = balance + c.amount;
      }
   }
   const held = data.bookings.filter(b => b.riderId === user.id &&
      (b.status === "pending" || b.status === "accepted")).length;
   const available = balance - held;

   let plateText = "";
   if (user.vehicle) {
      const plate = user.vehicle.plate;
      plateText = plate.substring(0, plate.length - 3) + " " + plate.substring(plate.length - 3);
   }

   const parts = user.name.split(" ");
   let initials = parts[0][0];
   if (parts.length > 1) {
      initials = initials + parts[1][0];
   }

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function startEditing() {
      if (user.vehicle) {
         setInputs({
            make: user.vehicle.make,
            model: user.vehicle.model,
            colour: user.vehicle.colour,
            plate: plateText,
            capacity: "" + user.vehicle.capacity
         });
      }
      else {
         setInputs({ make: "", model: "", colour: "", plate: "", capacity: "" });
      }
      setErrors({});
      setMessage("");
      setEditing(true);
   }

   function handleSubmit(event) {
      event.preventDefault();
      const plate = inputs.plate.replace(/\s/g, "").toUpperCase();
      const newErrors = {};

      if (inputs.make.trim() === "") {
         newErrors.make = "Enter the vehicle’s make.";
      }
      if (inputs.model.trim() === "") {
         newErrors.model = "Enter the vehicle’s model.";
      }
      if (inputs.colour.trim() === "") {
         newErrors.colour = "Enter the vehicle’s colour.";
      }
      if (!/^[0-9]{1,4}[A-Z]{3}$/.test(plate)) {
         newErrors.plate = "Enter the plate as 1–4 digits and 3 letters.";
      }
      else if (data.users.find(u => u.id !== user.id && u.vehicle && u.vehicle.plate === plate)) {
         newErrors.plate = "This plate is already registered to another account.";
      }
      if (!/^[1-7]$/.test(inputs.capacity)) {
         newErrors.capacity = "Capacity must be a whole number from 1 to 7.";
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
         return;
      }

      user.vehicle = {
         make: inputs.make.trim(),
         model: inputs.model.trim(),
         colour: inputs.colour.trim(),
         plate: plate,
         capacity: Number(inputs.capacity)
      };
      user.vehicleStatus = "pending";
      user.rejectReason = "";
      setEditing(false);
      setMessage("Vehicle submitted for review. An administrator will check it.");
   }

   function handleSignOut() {
      data.session.userId = null;
      setSignedOut(true);
   }

   let statusText = "";
   if (user.vehicleStatus === "pending") {
      statusText = "Pending review";
   }
   else if (user.vehicleStatus === "approved") {
      statusText = "Approved";
   }
   else if (user.vehicleStatus === "rejected") {
      statusText = "Rejected";
   }

   return (
      <div>
         <NavBar />
         <div className="auth-card">
            <h1>Account</h1>

            {message && <p className="auth-success">{message}</p>}

            <div className="account-box account-header">
               <p className="account-avatar">{initials}</p>
               <div>
                  <p className="account-name">{user.name} <span className="account-badge approved">Verified</span></p>
                  <p className="auth-muted account-left">{user.email}</p>
               </div>
            </div>

            <div className="account-box account-row">
               <div>
                  <p className="auth-hint">Available credits</p>
                  <p className="account-number">{available}</p>
               </div>
               <div>
                  <p className="auth-hint">Held credits</p>
                  <p className="account-number">{held}</p>
               </div>
               <Link to="/rider/credits">History</Link>
            </div>

            <div className="account-box">
               <div className="account-row">
                  <h2>Vehicle</h2>
                  {statusText && <p className={"account-badge " + user.vehicleStatus}>{statusText}</p>}
               </div>

               {user.vehicleStatus === "none" && !editing && (
                  <>
                     <p className="auth-hint">Add a vehicle to offer seats. An administrator reviews it first.</p>
                     <button type="button" className="auth-secondary-button" onClick={startEditing}>Add a vehicle</button>
                  </>
               )}

               {user.vehicleStatus === "pending" && !editing && (
                  <>
                     <p className="auth-info">Your vehicle is waiting for an administrator’s review. You can’t post trips until it is approved.</p>
                     <button type="button" className="auth-secondary-button" onClick={startEditing}>Edit and resubmit</button>
                  </>
               )}

               {user.vehicleStatus === "rejected" && !editing && (
                  <>
                     <p className="auth-alert">Not approved: {user.rejectReason}</p>
                     <button type="button" className="auth-secondary-button" onClick={startEditing}>Update and resubmit</button>
                  </>
               )}

               {user.vehicle && !editing && (
                  <p className="account-left">
                     {user.vehicle.make} {user.vehicle.model} · {user.vehicle.colour}<br />
                     Plate {plateText} · {user.vehicle.capacity} passengers
                  </p>
               )}

               {editing && (
                  <form className="account-form" onSubmit={handleSubmit} noValidate>
                     {Object.keys(errors).length > 0 && (
                        <p className="auth-alert">
                           Fix {Object.keys(errors).length} {Object.keys(errors).length === 1 ? "field" : "fields"} to continue
                        </p>
                     )}

                     <label htmlFor="make">Make *</label>
                     <input type="text" id="make" name="make" value={inputs.make} onChange={handleChange} />
                     {errors.make && <p className="auth-error">{errors.make}</p>}

                     <label htmlFor="model">Model *</label>
                     <input type="text" id="model" name="model" value={inputs.model} onChange={handleChange} />
                     {errors.model && <p className="auth-error">{errors.model}</p>}

                     <label htmlFor="colour">Colour *</label>
                     <input type="text" id="colour" name="colour" value={inputs.colour} onChange={handleChange} />
                     {errors.colour && <p className="auth-error">{errors.colour}</p>}

                     <label htmlFor="plate">Plate number *</label>
                     <input type="text" id="plate" name="plate" placeholder="e.g. 4821 RKA"
                        value={inputs.plate} onChange={handleChange} />
                     {errors.plate && <p className="auth-error">{errors.plate}</p>}

                     <label htmlFor="capacity">Passenger capacity *</label>
                     <select id="capacity" name="capacity" value={inputs.capacity} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                     </select>
                     {errors.capacity && <p className="auth-error">{errors.capacity}</p>}

                     <input type="submit" value="Submit for review" />
                     <button type="button" className="auth-secondary-button" onClick={() => setEditing(false)}>Cancel</button>
                  </form>
               )}
            </div>

            <div className="account-box account-links">
               <Link to="/driver/schedule">My Schedule</Link>
               <Link to="/rider/rides">My Rides & credit history</Link>
               {user.vehicleStatus !== "rejected" && (
                  <>
                     <Link to="/account/notifications">Notifications</Link>
                     <Link to="/driver">Driver dashboard</Link>
                  </>
               )}
            </div>

            <button type="button" className="auth-secondary-button" onClick={handleSignOut}>Sign out</button>
         </div>
      </div>
   );
}

export default Account;