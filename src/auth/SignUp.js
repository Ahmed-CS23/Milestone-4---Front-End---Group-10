import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import "./SignIn.css";
import "./SignUp.css";

function SignUp() {
   const [inputs, setInputs] = useState({
      name: "",
      email: "",
      password: "",
      confirm: "",
      offerSeats: false,
      make: "",
      model: "",
      colour: "",
      plate: "",
      capacity: ""
   });
   const [errors, setErrors] = useState({});
   const [createdEmail, setCreatedEmail] = useState("");
   const [message, setMessage] = useState("");

   function handleChange(event) {
   const name = event.target.name;
   const value = event.target.value;
   setInputs(values => ({...values, [name]: value}));
}

   function handleToggle() {
   setInputs(values => ({...values, offerSeats: !values.offerSeats}));
}

   function handleSubmit(event) {
      event.preventDefault();
      const name = inputs.name.trim();
      const email = inputs.email.trim().toLowerCase();
      const plate = inputs.plate.replace(/\s/g, "").toUpperCase();
      const newErrors = {};

      if (name === "") {
         newErrors.name = "Enter your full name.";
      }

      if (!/^[^\s@]+@kfupm\.edu\.sa$/.test(email)) {
         newErrors.email = "Use your KFUPM email address (…@kfupm.edu.sa).";
      }
      else if (data.users.find(e => e.email.toLowerCase() === email)) {
         newErrors.email = "An account with this email already exists — sign in instead.";
      }

      if (inputs.password.length < 8) {
         newErrors.password = "Password must be at least 8 characters.";
      }
      else if (!/[A-Za-z]/.test(inputs.password)) {
         newErrors.password = "Password must include at least one letter.";
      }
      else if (!/[0-9]/.test(inputs.password)) {
         newErrors.password = "Password must include at least one digit.";
      }

      if (inputs.confirm === "" || inputs.confirm !== inputs.password) {
         newErrors.confirm = "Passwords do not match.";
      }

      if (inputs.offerSeats) {
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
         else if (data.users.find(e => e.vehicle && e.vehicle.plate === plate)) {
            newErrors.plate = "This plate is already registered to another account.";
         }
         if (!/^[1-7]$/.test(inputs.capacity)) {
            newErrors.capacity = "Capacity must be a whole number from 1 to 7.";
         }
      }

      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
         const count = Object.keys(newErrors).length;
         setMessage(`Fix ${count} ${count === 1 ? "field" : "fields"} to continue`);
         return;
      }
      setMessage("");

      data.users.push({
         id: "u" + Date.now(),
         name: name,
         email: email,
         password: inputs.password,
         role: "user",
         verified: false,
         status: "active",
         vehicleStatus: inputs.offerSeats ? "pending" : "none",
         vehicle: inputs.offerSeats ? {
            make: inputs.make.trim(),
            model: inputs.model.trim(),
            colour: inputs.colour.trim(),
            plate: plate,
            capacity: Number(inputs.capacity)
         } : null,
         schedule: [],
         verifySentAt: Date.now()
      });
      setCreatedEmail(email);
   }

   if (createdEmail) {
      return (
         <div className="auth-card">
            <h1>Account created</h1>
            <p className="auth-muted">We sent a verification link to {createdEmail}.</p>
            <Link className="auth-link-button" to={`/account/check-inbox?email=${createdEmail}`}>Continue</Link>
         </div>
      );
   }

   return (
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
         <h1>Create your account</h1>
         <p className="auth-muted">For KFUPM students and staff. Rides use ride credits — no money.</p>

         {message && <p className="auth-alert">{message}</p>}

         <label htmlFor="name">Full name *</label>
         <input type="text" id="name" name="name"
            value={inputs.name} onChange={handleChange} />
         {errors.name && <p className="auth-error">{errors.name}</p>}

         <label htmlFor="email">University email *</label>
         <input type="email" id="email" name="email" placeholder="name@kfupm.edu.sa"
            value={inputs.email} onChange={handleChange} />
         {errors.email && <p className="auth-error">{errors.email}</p>}

         <label htmlFor="password">Password *</label>
         <input type="password" id="password" name="password"
            value={inputs.password} onChange={handleChange} />
         {errors.password ?
            <p className="auth-error">{errors.password}</p> :
            <p className="auth-hint">At least 8 characters, with a letter and a digit.</p>}

         <label htmlFor="confirm">Confirm password *</label>
         <input type="password" id="confirm" name="confirm"
            value={inputs.confirm} onChange={handleChange} />
         {errors.confirm && <p className="auth-error">{errors.confirm}</p>}

         <div className="auth-check">
            <label htmlFor="offerSeats">I want to offer seats</label>
            <button type="button" id="offerSeats"
               className={inputs.offerSeats ? "switch on" : "switch"}
               onClick={handleToggle}>
               <span className="knob"></span>
            </button>
         </div>

         {inputs.offerSeats && (
            <div className="auth-section">
               <p className="auth-hint">An administrator reviews your vehicle before you can post trips.</p>

               <label htmlFor="make">Make *</label>
               <input type="text" id="make" name="make"
                  value={inputs.make} onChange={handleChange} />
               {errors.make && <p className="auth-error">{errors.make}</p>}

               <label htmlFor="model">Model *</label>
               <input type="text" id="model" name="model"
                  value={inputs.model} onChange={handleChange} />
               {errors.model && <p className="auth-error">{errors.model}</p>}

               <label htmlFor="colour">Colour *</label>
               <input type="text" id="colour" name="colour"
                  value={inputs.colour} onChange={handleChange} />
               {errors.colour && <p className="auth-error">{errors.colour}</p>}

               <label htmlFor="plate">Plate number *</label>
               <input type="text" id="plate" name="plate" placeholder="e.g. 4821 RKA"
                  value={inputs.plate} onChange={handleChange} />
               {errors.plate ?
                  <p className="auth-error">{errors.plate}</p> :
                  <p className="auth-hint">Never shown to other users.</p>}

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
            </div>
         )}

         <input type="submit" value="Create account" />

         <p className="auth-center">
            Already have an account? <Link to="/account/sign-in">Sign in</Link>
         </p>
      </form>
   );
}

export default SignUp;