import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import data from "../shared/data";
import "../auth/SignIn.css";

function AdminSignIn() {
   const navigate = useNavigate();

   const [inputs, setInputs] = useState({email: "", password: ""});
   const [errors, setErrors] = useState({});
   const [message, setMessage] = useState("");
   const [failedTries, setFailedTries] = useState(0);

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function handleSubmit(event) {
      event.preventDefault();

      // Locked after 5 failed tries
      if (failedTries >= 5) {
         setMessage("Too many attempts. Try again in 15 minutes.");
         return;
      }

      const email = inputs.email.trim().toLowerCase();
      const password = inputs.password;

      const emptyError = {};
      if (email === "") {
         emptyError.email = "Enter your email.";
      }
      if (password === "") {
         emptyError.password = "Enter your password.";
      }
      setErrors(emptyError);
      setMessage("");
      if (emptyError.email || emptyError.password) {
         return;
      }

      const found = data.users.find(e => e.role === "admin" && e.email.toLowerCase() === email);

      if (!found || found.password !== password) {
         setFailedTries(failedTries + 1);
         setMessage("Email or password is incorrect.");
      }
      else {
         data.session.userId = found.id;
         navigate("/admin");
      }
   }

   return (
       <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <h1>UniRide Admin</h1>
          <p className="auth-muted">Use your KFUPM account.</p>

          {message && <p className="auth-alert">{message}</p>}

          <label htmlFor="email">Email *</label>
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
             <Link to="/account/sign-in">Back to user sign-in</Link>
          </p>
       </form>
   );
}

export default AdminSignIn;