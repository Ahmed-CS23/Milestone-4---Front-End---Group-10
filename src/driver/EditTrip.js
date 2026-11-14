import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard, { NoAccess, TripNotFound } from "./DriverGuard";
import TopBar, { Banner } from "./DriverUI";
import TripFields, { checkTrip } from "./TripForm";
import utils from "./driverUtils";
import "./Driver.css";
import "./EditTrip.css";

// Describes each change exactly, for the riders' notification (FR-D5 step 4).
function describeChanges(trip, updated) {
   const list = [];
   if (updated.departure !== trip.departure) {
      if (updated.departure.substring(0, 10) === trip.departure.substring(0, 10)) {
         list.push("departure time " + utils.formatTime(new Date(trip.departure)).replace(/ (AM|PM)$/, "") +
            " → " + utils.formatTime(new Date(updated.departure)));
      }
      else {
         list.push("departure " + utils.formatDeparture(trip.departure) + " → " + utils.formatDeparture(updated.departure));
      }
   }
   if (updated.origin !== trip.origin) {
      list.push("origin " + trip.origin + " → " + updated.origin);
   }
   if (updated.destination !== trip.destination) {
      list.push("destination " + trip.destination + " → " + updated.destination);
   }
   if (updated.pickup !== trip.pickup) {
      list.push("pickup point " + trip.pickup + " → " + updated.pickup);
   }
   if (updated.seats !== trip.seats) {
      list.push("seats " + trip.seats + " → " + updated.seats);
   }
   if (updated.note !== trip.note) {
      list.push("note");
   }
   return list;
}

// WF-36 · Edit trip, WF-36a validation (FR-D5)
function EditTrip() {
   const { tripId } = useParams();
   const navigate = useNavigate();
   const trip = data.trips.find(t => t.id === tripId);
   const [inputs, setInputs] = useState(() => {
      if (!trip) {
         return { origin: "", destination: "", pickup: "", date: "", time: "", seats: "", note: "" };
      }
      return {
         origin: trip.origin,
         destination: trip.destination,
         pickup: trip.pickup,
         date: trip.departure.substring(0, 10),
         time: trip.departure.substring(11, 16),
         seats: "" + trip.seats,
         note: trip.note
      };
   });
   const [errors, setErrors] = useState({});
   const user = utils.getSignedInUser();

   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }
   if (!trip) {
      return <TripNotFound />;
   }
   if (trip.driverId !== user.id) {
      return <NoAccess />;
   }

   const state = utils.getTripState(trip);
   if (state !== "open" && state !== "full") {
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Edit trip" back={"/driver/trips/" + trip.id} />
               <Banner type="info" title="This trip can’t be edited">
                  <p>Only trips that haven’t departed can be changed. This one is {utils.stateText[state].toLowerCase()}.</p>
               </Banner>
               <Link className="driver-button" to={"/driver/trips/" + trip.id}>Back to the trip</Link>
            </div>
         </div>
      );
   }

   const accepted = utils.getBookings(trip.id, "accepted");

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function handleSubmit(event) {
      event.preventDefault();
      const newErrors = checkTrip(inputs, user, trip, accepted.length);
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
         return;
      }

      const updated = {
         origin: inputs.origin,
         destination: inputs.destination,
         pickup: inputs.pickup,
         departure: inputs.date + "T" + inputs.time,
         seats: Number(inputs.seats),
         note: inputs.note.trim()
      };
      const changes = describeChanges(trip, updated);
      if (changes.length === 0) {
         navigate("/driver/trips/" + trip.id + "?tab=details");
         return;
      }

      const taken = trip.seats - trip.seatsLeft;
      trip.origin = updated.origin;
      trip.destination = updated.destination;
      trip.pickup = updated.pickup;
      trip.departure = updated.departure;
      trip.seats = updated.seats;
      trip.note = updated.note;
      trip.seatsLeft = trip.seats - taken;
      trip.status = trip.seatsLeft === 0 ? "full" : "open";
      trip.lastChange = changes.join("; ");

      for (let i = 0; i < accepted.length; i++) {
         utils.notify(accepted[i].riderId, "changed", "Trip updated",
            user.name + " changed your trip on " + utils.formatDeparture(trip.departure) + ": " + trip.lastChange + ".",
            "/rider/rides");
      }
      navigate("/driver/trips/" + trip.id + "?tab=details&msg=edited&n=" + accepted.length);
   }

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="Edit trip" back={"/driver/trips/" + trip.id + "?tab=details"} />
            {accepted.length > 0 && (
               <Banner type="info">
                  <p>{accepted.length} accepted {accepted.length === 1 ? "rider" : "riders"} will be notified of exactly what you change.</p>
               </Banner>
            )}
            <form className="driver-form" onSubmit={handleSubmit} noValidate>
               <TripFields inputs={inputs} errors={errors} capacity={user.vehicle.capacity}
                  acceptedCount={accepted.length} originalTime={trip.departure.substring(11, 16)}
                  verb="save" onChange={handleChange} />
               <input type="submit" value="Save changes" />
               <Link className="driver-center driver-strong" to={"/driver/trips/" + trip.id + "?tab=details"}>Discard changes</Link>
            </form>
         </div>
      </div>
   );
}

export default EditTrip;
