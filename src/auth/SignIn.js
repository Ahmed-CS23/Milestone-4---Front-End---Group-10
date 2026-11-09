import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import "./SignIn.css";

function SignIn() {
   const [inputs, setInputs] = useState({ email: "", password: "" });
   const [errors, setErrors] = useState({});
   const [message, setMessage] = useState("");
   const [user, setUser] = useState(null);

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function handleSubmit(event) {
      event.preventDefault();
      const email = inputs.email.trim().toLowerCase();
      const password = inputs.password;

      const emptyError = {};
      if (email === "") {
         emptyError.email = "Enter your university email.";
      }
      if (password === "") {
         emptyError.password = "Enter your password.";
      }
      setErrors(emptyError);
      setMessage("");
      if (emptyError.email || emptyError.password) {
         return;
      }

      const found = data.users.find(e => e.role === "user" && e.email.toLowerCase() === email);
      if (!found || found.password !== password) {
         setMessage("Email or password is incorrect.");
      }
      else if (!found.verified) {
         setMessage("Verify your email before signing in.");
      }
      else if (found.status === "suspended") {
         setMessage("Your account is suspended.");
      }
      else {
         data.session.userId = found.id;
         setUser(found);
      }
   }

   if (user) {
      return (
         <div className="auth-card">
            <h1>Welcome back, {user.name}</h1>
            <p className="auth-muted">You are signed in.</p>
            <Link className="auth-link-button" to="/rider">Find a ride</Link>
         </div>
      );
   }

   return (
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
         <h1>Sign in</h1>
         <p className="auth-muted">Use your KFUPM account.</p>

         {message && <p className="auth-alert">{message}</p>}

         <label htmlFor="email">University email *</label>
         <input
            type="email"
            id="email"
            name="email"
            value={inputs.email}
            onChange={handleChange} />
         {errors.email && <p className="auth-error">{errors.email}</p>}

         <label htmlFor="password">Password *</label>
         <input
            type="password"
            id="password"
            name="password"
            value={inputs.password}
            onChange={handleChange} />
         {errors.password && <p className="auth-error">{errors.password}</p>}

         <input type="submit" value="Sign in" />

         <p className="auth-center">
            New to UniRide? <Link to="/account/sign-up">Create an account</Link>
         </p>
      </form>
   );
}

export default SignIn;