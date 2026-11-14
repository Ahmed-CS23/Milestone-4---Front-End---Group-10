import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard from "./DriverGuard";
import TopBar, { Pill } from "./DriverUI";
import TripFields, { checkTrip } from "./TripForm";
import utils from "./driverUtils";
import "./Driver.css";
import "./PostTrip.css";

// WF-32 · Post a trip, WF-32a validation, WF-32D desktop form with a live rider preview (FR-D2)
function PostTrip() {
   const navigate = useNavigate();
   const [inputs, setInputs] = useState({ origin: "", destination: "", pickup: "", date: "", time: "", seats: "", note: "" });
   const [errors, setErrors] = useState({});
   const user = utils.getSignedInUser();

   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function handleSubmit(event) {
      event.preventDefault();
      const newErrors = checkTrip(inputs, user, null, 0);
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
         return;
      }

      const id = utils.newId("t");
      data.trips.push({
         id: id,
         driverId: user.id,
         origin: inputs.origin,
         destination: inputs.destination,
         pickup: inputs.pickup,
         departure: inputs.date + "T" + inputs.time,
         seats: Number(inputs.seats),
         seatsLeft: Number(inputs.seats),
         note: inputs.note.trim(),
         status: "open"
      });
      // WF-32b: open the new trip's page with a confirmation.
      navigate("/driver/trips/" + id + "?msg=published");
   }

   const ready = inputs.date !== "" && inputs.time !== "";

   return (
      <div>
         <NavBar />
         <div className="driver-card driver-wide">
            <TopBar title="Post a trip" back="/driver" />
            <div className="driver-post">
               <form className="driver-form" onSubmit={handleSubmit} noValidate>
                  <TripFields inputs={inputs} errors={errors} capacity={user.vehicle.capacity}
                     acceptedCount={0} verb="publish" onChange={handleChange} />
                  <input type="submit" value="Publish trip" />
                  <Link className="driver-center driver-strong" to="/driver">Cancel</Link>
               </form>

               <aside className="driver-preview" aria-label="Rider preview">
                  <p className="driver-hint">Rider preview</p>
                  <div className="driver-trip">
                     <div className="driver-split">
                        <span className="driver-strong">{ready ? utils.formatDeparture(inputs.date + "T" + inputs.time) : "Departure"}</span>
                        <Pill tone="green">{inputs.seats || "–"} seats left</Pill>
                     </div>
                     <span className="driver-hint">{inputs.origin || "Origin"} → {inputs.destination || "Destination"}</span>
                     <span className="driver-hint">Pickup: {inputs.pickup || "–"}</span>
                     <span className="driver-hint">{user.name} · {utils.getAverageRating(user.id)}</span>
                     {inputs.note && <span className="driver-muted">“{inputs.note}”</span>}
                  </div>
               </aside>
            </div>
         </div>
      </div>
   );
}

export default PostTrip;
