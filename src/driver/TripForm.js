import { Banner, FieldError } from "./DriverUI";
import utils from "./driverUtils";
import "./TripForm.css";

// Checks the trip form for Post a trip (WF-32a) and Edit trip (WF-36a). Returns { field: message }.
function checkTrip(inputs, user, editing, acceptedCount) {
   const errors = {};
   const departure = inputs.date + "T" + inputs.time;

   if (inputs.origin === "") {
      errors.origin = "Choose where the trip starts.";
   }
   if (inputs.destination === "") {
      errors.destination = "Choose where the trip ends.";
   }
   else if (inputs.origin === inputs.destination) {
      errors.destination = "Origin and destination must be different.";
   }
   if (inputs.pickup === "") {
      errors.pickup = "Choose a pickup point from the list.";
   }
   if (inputs.date === "" || inputs.time === "") {
      errors.time = "Enter the departure date and time.";
   }
   else if (new Date(departure).getTime() <= Date.now()) {
      errors.time = editing ? "Departure can’t be moved into the past." : "The departure must be in the future.";
   }
   else {
      const conflict = utils.findConflict(user.id, departure, editing ? editing.id : null);
      if (conflict) {
         errors.time = "Within 60 minutes of your " + utils.formatTime(new Date(conflict.departure)) + " trip that day.";
         errors.conflict = "You already have a published trip departing within 60 minutes: " +
            utils.formatDeparture(conflict.departure).replace(" · ", ", ") + " (" + conflict.origin + " → " + conflict.destination + ").";
      }
   }

   const seats = Number(inputs.seats);
   if (inputs.seats === "" || seats < 1 || seats > user.vehicle.capacity) {
      errors.seats = "Seats must be between 1 and " + user.vehicle.capacity + " (your vehicle’s capacity).";
   }
   else if (seats < acceptedCount) {
      errors.seats = "Seats can’t be lower than the " + acceptedCount + " riders already accepted.";
   }
   if (inputs.note.length > 200) {
      errors.note = "Keep the note to 200 characters or fewer.";
   }
   return errors;
}

function countProblems(errors) {
   return Object.keys(errors).filter(k => k !== "conflict").length;
}

// The form fields shared by WF-32 and WF-36.
function TripFields(props) {
   const inputs = props.inputs;
   const errors = props.errors;
   const problems = countProblems(errors);
   const min = props.acceptedCount > 0 ? props.acceptedCount : 1;
   const seatOptions = [];
   for (let i = min; i <= props.capacity; i++) {
      seatOptions.push(i);
   }

   function cls(name) {
      return errors[name] ? "driver-invalid" : "";
   }

   return (
      <>
         {problems > 0 && (
            <Banner type="error" title={"Fix " + problems + (problems === 1 ? " problem" : " problems") + " to " + props.verb}>
               {errors.conflict && <p>{errors.conflict}</p>}
            </Banner>
         )}

         <div className="driver-field">
            <label htmlFor="origin">Origin area *</label>
            <select id="origin" name="origin" className={cls("origin")} value={inputs.origin} onChange={props.onChange}>
               <option value="">Select an area</option>
               {utils.areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <FieldError text={errors.origin} />
         </div>

         <div className="driver-field">
            <label htmlFor="destination">Destination *</label>
            <select id="destination" name="destination" className={cls("destination")} value={inputs.destination} onChange={props.onChange}>
               <option value="">Select an area</option>
               {utils.areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {errors.destination ? <FieldError text={errors.destination} /> :
               <p className="driver-hint">A campus gate or an off-campus area</p>}
         </div>

         <div className="driver-field">
            <label htmlFor="pickup">Pickup point *</label>
            <select id="pickup" name="pickup" className={cls("pickup")} value={inputs.pickup} onChange={props.onChange}>
               <option value="">Select a gate or landmark</option>
               {utils.pickupPoints.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.pickup ? <FieldError text={errors.pickup} /> :
               <p className="driver-hint">Named campus gates and neighbourhood landmarks only</p>}
         </div>

         <div className="driver-pair">
            <div className="driver-field">
               <label htmlFor="date">Departure date *</label>
               <input type="date" id="date" name="date" className={cls("time")} value={inputs.date} onChange={props.onChange} />
            </div>
            <div className="driver-field">
               <label htmlFor="time">Time *</label>
               <input type="time" id="time" name="time" className={cls("time")} value={inputs.time} onChange={props.onChange} />
            </div>
         </div>
         {errors.time && <FieldError text={errors.time} />}
         {!errors.time && props.originalTime && props.originalTime !== inputs.time && (
            <p className="driver-hint driver-right">Changed from {utils.formatTime(props.originalTime)}</p>
         )}

         <div className="driver-field">
            <label htmlFor="seats">Seats offered *</label>
            <select id="seats" name="seats" className={cls("seats")} value={inputs.seats} onChange={props.onChange}>
               <option value="">Select</option>
               {seatOptions.map(n => <option key={n} value={"" + n}>{n}</option>)}
            </select>
            {errors.seats ? <FieldError text={errors.seats} /> :
               <p className="driver-hint">
                  {props.acceptedCount > 0 ?
                     "At least " + props.acceptedCount + " (already accepted) and at most " + props.capacity + " (capacity)" :
                     "1–" + props.capacity + " (your vehicle’s capacity)"}
               </p>}
         </div>

         <div className="driver-field">
            <label htmlFor="note">Note (optional)</label>
            <textarea id="note" name="note" rows="3" className={cls("note")}
               placeholder="e.g. I leave on time. Please be at the corner 5 minutes early."
               value={inputs.note} onChange={props.onChange} />
            {errors.note ? <FieldError text={errors.note} /> :
               <p className="driver-hint">Up to 200 characters · {inputs.note.length}/200</p>}
         </div>
      </>
   );
}

export { checkTrip };
export default TripFields;
