import { Link } from "react-router-dom";
import "./NavBar.css";

function NavBar() {
   return (
      <nav className="navbar">
         <Link to="/rider">Find a ride</Link>
         <Link to="/rider/rides">My Rides</Link>
         <Link to="/driver">Drive</Link>
         <Link to="/account/notifications">Alerts</Link>
         <Link to="/account">Account</Link>
      </nav>
   );
}

export default NavBar;
