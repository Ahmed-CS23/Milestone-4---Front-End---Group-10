import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import "./FindRide.css";

const areas = ["Al-Rakah", "KFUPM Gate 2"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const filterFields = [
   { name: "seats", label: "Seats left", options: ["1", "2", "3"], suffix: "+", chip: (value) => value + "+ seats" },
   { name: "rating", label: "Minimum driver rating", options: ["4.5", "4.0", "3.5"], chip: (value) => "Rating ≥ " + value },
   { name: "distance", label: "Pickup distance", options: ["1", "3", "5"], suffix: " km", chip: (value) => "Within " + value + " km" },
   { name: "schedule", label: "Fits my schedule", chip: () => "Fits my schedule" }
];
const emptyFilters = { seats: "", rating: "", distance: "", schedule: false };
function timeMinutes(time) {
   const [hours, minutes] = time.split(":");
   return Number(hours) * 60 + Number(minutes);
}
function clockTime(minutes) {
   return [Math.floor(minutes / 60), minutes % 60].map((part) => String(part).padStart(2, "0")).join(":");
}
function displayTime(time) {
   const parts = time.split(":");
   const hour = Number(parts[0]);
   return (hour % 12 || 12) + ":" + parts[1] + (hour < 12 ? " AM" : " PM");
}
function searchSummary(search) {
   const day = new Date(search.date + "T00:00");
   const date = weekdays[day.getDay()] + " " + day.getDate() + " " + months[day.getMonth()];
   return date + " · " + displayTime(search.after) + "–" + displayTime(search.before);
}

const tripCount = (count) => count + (count === 1 ? " trip" : " trips");
const activeFilters = (filters) => filterFields.filter((field) => filters[field.name]);
const withinDistance = (trip, limit) => typeof trip.pickupKm === "number" && trip.pickupKm >= 0 && trip.pickupKm <= limit;
function averageRating(driverId) {
   const ratings = data.ratings.filter((rating) => rating.toId === driverId && !rating.deleted);
   return ratings.length ? ratings.reduce((total, rating) => total + rating.stars, 0) / ratings.length : null;
}
function fitsSchedule(trip, schedule) {
   const day = weekdays[new Date(trip.departure).getDay()];
   const classes = schedule.filter((entry) => entry.day === day);
   if (!classes.length) return false;

   const departure = timeMinutes(trip.departure.split("T")[1]);
   if (trip.destination.startsWith("KFUPM")) {
      const first = Math.min(...classes.map((entry) => timeMinutes(entry.start)));
      return departure >= first - 90 && departure <= first - 15;
   }
   const last = Math.max(...classes.map((entry) => timeMinutes(entry.end)));
   return trip.origin.startsWith("KFUPM") && departure >= last && departure <= last + 90;
}
function passesFilter(result, name, value) {
   if (name === "seats") return result.trip.seatsLeft >= Number(value);
   if (name === "rating") return result.rating !== null && result.rating >= Number(value);
   if (name === "distance") return withinDistance(result.trip, Number(value));
   return result.fits;
}
function matchingFilters(results, filters) {
   const active = activeFilters(filters);
   return results.filter((result) =>
      active.every(({ name }) => passesFilter(result, name, filters[name]))
   );
}
function findTrips(search, user, schedule) {
   if (!search) return [];
   const now = new Date();

   return data.trips.filter((trip) => {
      const parts = trip.departure.split("T");
      const originMatches = search.nearby ? withinDistance(trip, 5) : trip.origin === search.from;
      return trip.status === "open" && trip.seatsLeft > 0 &&
         trip.driverId !== user.id && new Date(trip.departure) > now &&
         originMatches && trip.destination === search.to &&
         parts[0] === search.date && parts[1] >= search.after && parts[1] <= search.before;
   }).sort((a, b) => new Date(a.departure) - new Date(b.departure)).map((trip) => ({
      trip,
      driver: data.users.find((entry) => entry.id === trip.driverId),
      rating: averageRating(trip.driverId),
      fits: fitsSchedule(trip, schedule)
   }));
}
function locations(field) {
   const openLocations = data.trips.filter((trip) => trip.status === "open").map((trip) => trip[field]);
   const locations = areas.concat(openLocations);
   return locations.filter((location, index) => locations.indexOf(location) === index);
}
function rideCredits(userId) {
   const balanceTypes = ["starting", "earned", "spent", "admin"];
   const entries = data.credits.filter((entry) => entry.userId === userId && balanceTypes.includes(entry.type));
   const balance = entries.reduce((total, entry) => total + entry.amount, 0);
   const held = data.bookings.filter((booking) =>
      booking.riderId === userId && ["pending", "accepted"].includes(booking.status)
   ).length;
   return { available: balance - held, held };
}
function findStrongestFilter(base, filters) {
   let strongestFilter = null;
   for (const field of activeFilters(filters)) {
      const { name } = field;
      const removed = base.filter((result) => !passesFilter(result, name, filters[name])).length;
      if (removed > (strongestFilter?.removed || 0)) strongestFilter = { name, removed, label: field.chip(filters[name]) };
   }
   return strongestFilter;
}
function validateSearch(inputs) {
   const nextErrors = {};
   const today = new Date();
   today.setHours(0, 0, 0, 0);

   if (!inputs.from) nextErrors.from = "Choose where you are leaving from.";
   if (!inputs.to) nextErrors.to = "Choose a destination.";
   if (!inputs.date) nextErrors.date = "Choose a date.";
   else if (new Date(inputs.date + "T00:00") < today) nextErrors.date = "Date can’t be in the past.";
   if (!inputs.after) nextErrors.after = "Choose a start time.";
   if (!inputs.before) nextErrors.before = "Choose an end time.";
   else if (inputs.after && inputs.before <= inputs.after) nextErrors.before = "Must be after the start time.";
   return nextErrors;
}
function selectOptions(options, placeholder, suffix = "") {
   return [<option key="" value="">{placeholder}</option>,
      ...options.map((option) => <option key={option} value={option}>{option}{suffix}</option>)];
}
function button(label, onClick, style = "secondary", props = {}) {
   return <button className={"rider-" + style} type="button" onClick={onClick} {...props}>{label}</button>;
}
function FindRide() {
   const [inputs, setInputs] = useState({ from: "", to: "", date: "", after: "", before: "" });
   const [errors, setErrors] = useState({});
   const [search, setSearch] = useState(null);
   const [filters, setFilters] = useState(emptyFilters);
   const [sheet, setSheet] = useState(null);
   const [alerts, setAlerts] = useState(() => data.alerts || []);
   const user = data.users.find((entry) => entry.id === data.session.userId);
   if (!user || !user.verified || user.status === "suspended") {
      const accountMessage = user?.status === "suspended" ? "Your account is suspended." : "Verify your email before searching for rides.";
      return <main className="rider-page">
         <h1>Find a ride</h1>
         <p>{user ? accountMessage : "Sign in to find a ride."}</p>
         {!user && <Link to="/account/sign-in">Sign in</Link>}
      </main>;
   }

   // Only the filter sheet stores unapplied choices.
   const draft = sheet && sheet.filters;
   const schedule = user.schedule || [];
   const credits = rideCredits(user.id);
   const myAlerts = alerts.filter((alert) => alert.userId === user.id);
   const base = findTrips(search, user, schedule);
   const active = activeFilters(filters);
   const results = matchingFilters(base, filters);
   const strongestFilter = base.length && !results.length ? findStrongestFilter(base, filters) : null;
   function handleChange({ target: { name, value } }) {
      setInputs((previous) => ({ ...previous, [name]: value }));
   }
   function handleSearch(event) {
      event.preventDefault();
      const nextErrors = validateSearch(inputs);
      setErrors(nextErrors);
      if (!nextErrors.from && !nextErrors.to && !nextErrors.date && !nextErrors.after && !nextErrors.before) {
         setSearch(inputs);
         setFilters(emptyFilters);
      }
   }
   function widenSearch(after, before) {
      setInputs({ ...inputs, after, before });
      setSearch({ ...search, after, before });
   }
   const clearFilter = (name) => setFilters({ ...filters, [name]: emptyFilters[name] });
   const openFilters = (nextFilters = filters) => setSheet({ filters: nextFilters });
   function updateDraft(name, value) {
      const needsSchedule = name === "schedule" && value && !schedule.length;
      if (needsSchedule) setSheet({ ...sheet, scheduleWarning: true });
      else setSheet({ ...sheet, filters: { ...draft, [name]: value } });
   }
   function saveAlert() {
      // Add the shared list on first use so this page works with older sample data.
      if (!data.alerts) data.alerts = [];
      data.alerts.push({ id: "a" + Date.now(), userId: user.id, search: { ...search }, filters: { ...filters } });
      setAlerts(data.alerts.slice());
      setSheet(null);
      setSearch(null);
   }
   function deleteAlert(id) {
      data.alerts = alerts.filter((alert) => alert.userId !== user.id || alert.id !== id);
      setAlerts(data.alerts);
   }
   function field(name, label, options, settings = {}) {
      const { type, hint, suffix, placeholder } = settings;
      const isFilter = name.startsWith("filter-");
      const key = isFilter ? name.slice(7) : name;
      const error = !isFilter && errors[key];
      const id = "rider-" + name;
      const description = [hint && id + "-hint", error && id + "-error"].filter(Boolean).join(" ");
      const props = { id, name, value: isFilter ? draft[key] : inputs[key], required: !isFilter,
         onChange: isFilter ? (event) => updateDraft(key, event.target.value) : handleChange,
         "aria-invalid": !isFilter ? Boolean(error) : undefined,
         "aria-describedby": description || undefined };
      return <div className="rider-field" key={name}>
            <label htmlFor={id}>{label}</label>
            {options ? <select {...props}>{selectOptions(options, placeholder, suffix)}</select> : <input {...props} type={type} />}
            {hint && <small id={id + "-hint"}>{hint}</small>}
            {error && <p id={id + "-error"} className="rider-error">{error}</p>}
      </div>;
   }
   function renderAlertSummary(alertSearch, alertFilters) {
      const labels = activeFilters(alertFilters).map((field) => field.chip(alertFilters[field.name]));
      return <>
            <strong>{alertSearch.from} → {alertSearch.to}</strong>
            <p>{searchSummary(alertSearch)}</p>
            {alertSearch.nearby && <p>Nearby pickup points within 5 km</p>}
            {labels.length > 0 && <p>{labels.join(" · ")}</p>}
      </>;
   }
   const searchForm = !search && <>
         <h1>Find a ride</h1>
         <section className="rider-card rider-row" aria-label="Ride credits">
            <div>Available credits <strong>{credits.available}</strong></div>
            <div>Held credits <strong>{credits.held}</strong></div>
            <Link to="/rider/credits">History</Link>
         </section>
         <form className="rider-search" onSubmit={handleSearch} noValidate>
            <div className="rider-row">
               {field("from", "From", locations("origin"), { placeholder: "Select an origin" })}
               {field("to", "To", locations("destination"), { placeholder: "Select a destination", hint: "Campus gate or off-campus area" })}
            </div>
            {field("date", "Date", null, { type: "date" })}
            <div className="rider-row">
               {field("after", "Depart after", null, { type: "time" })}
               {field("before", "Depart before", null, { type: "time" })}
            </div>
            <button className="rider-primary" type="submit">Search trips</button>
         </form>
         <section className="rider-stack">
            <h2>Saved alerts</h2>
            {myAlerts.length === 0 && <p>No saved alerts.</p>}
            {myAlerts.map((alert) => (
               <div className="rider-card rider-row" key={alert.id}>
                  <div>{renderAlertSummary(alert.search, alert.filters)}</div>
                  {button("Delete", () => deleteAlert(alert.id), "link-button", {
                     "aria-label": "Delete alert from " + alert.search.from + " to " + alert.search.to
                  })}
               </div>
            ))}
         </section>
   </>;
   const editSearch = () => setSearch(null);
   const widerAfter = search && clockTime(Math.max(0, timeMinutes(search.after) - 30));
   const widerBefore = search && clockTime(Math.min(1439, timeMinutes(search.before) + 30));
   const searchResults = search && <>
         <h1>{button("←", editSearch, "back", { "aria-label": "Back to search" })} Results</h1>
         <section className="rider-card rider-row" aria-label="Search summary">
            <div>{renderAlertSummary(search, emptyFilters)}</div>
            {button("Edit", editSearch, "link-button")}
         </section>
         <div className="rider-row">
            <p aria-live="polite">{tripCount(results.length)} · by departure time</p>
            {button(active.length ? "Filters (" + active.length + ")" : "Filters", () => openFilters())}
         </div>
         {active.length > 0 && <div className="rider-chips" aria-label="Active filters">
               {active.map(({ name, chip }) => (
                  <button className="rider-chip" type="button" key={name} onClick={() => clearFilter(name)}
                     aria-label={"Remove " + chip(filters[name])}>{chip(filters[name])} ×</button>
               ))}
         </div>}
         {!results.length && (
            <section className="rider-card rider-stack">
               <h2>{strongestFilter ? "No trips match your filters" : "No trips match this search"}</h2>
               {strongestFilter ? (
                  <>
                     <p>{strongestFilter.label} removes the most trips ({strongestFilter.removed} of {base.length} matches).</p>
                     <div className="rider-row">
                        {button("Clear that filter", () => clearFilter(strongestFilter.name))}
                        {button("Clear all filters", () => setFilters(emptyFilters), "link-button")}
                     </div>
                  </>
               ) : (
                  <>
                     {button("Widen to " + displayTime(widerAfter) + "–" + displayTime(widerBefore),
                        () => widenSearch(widerAfter, widerBefore), "secondary",
                        { disabled: widerAfter === search.after && widerBefore === search.before })}
                     {search.nearby ? <p>Nearby search includes only pickup points with a recorded distance of 5 km or less.</p> : (
                        button("Search nearby pickup points", () => setSearch({ ...search, nearby: true }))
                     )}
                  </>
               )}
            </section>
         )}
         {results.map((result) => (
            <Link className="rider-card rider-trip" to={"/rider/trip/" + result.trip.id} key={result.trip.id}>
               <div className="rider-row">
                  <strong>{displayTime(result.trip.departure.split("T")[1])}</strong>
                  <span>{result.trip.seatsLeft} {result.trip.seatsLeft === 1 ? "seat" : "seats"} left</span>
               </div>
               <h2>{result.trip.origin} → {result.trip.destination}</h2>
               <p>Pickup: {result.trip.pickup}</p>
               <p>{result.driver ? result.driver.name : "Unknown driver"} · {result.rating === null ? "No ratings yet" : result.rating.toFixed(1) + " / 5"}</p>
               {result.fits && <span className="rider-tag">Fits my schedule</span>}
            </Link>
         ))}
         {button((results.length ? "No good time? " : "") + "Save this search as an alert",
            () => setSheet({}), "link-button")}
   </>;

   return (
      <>
         <NavBar />
         <main className="rider-page">
            {searchForm}
            {searchResults}
            {sheet && (
               <dialog className="rider-sheet" ref={(dialog) => { if (dialog && !dialog.open) dialog.showModal(); }} onCancel={() => setSheet(null)}
                  aria-labelledby="rider-sheet-heading">
                  <div className="rider-stack">
                     <div className="rider-row">
                        <h2 id="rider-sheet-heading">{draft ? "Filters" : "Save this search as an alert"}</h2>
                        {draft && button("Reset", () => openFilters(emptyFilters), "link-button")}
                     </div>
                     {draft && filterFields.filter((option) => option.options).map(({ name, label, options, suffix }) =>
                        field("filter-" + name, label, options, { placeholder: "Any", suffix })
                     )}
                     {draft && <label className="rider-toggle">
                           <input type="checkbox" checked={draft.schedule}
                              onChange={(event) => updateDraft("schedule", event.target.checked)} />
                           Fits my schedule
                     </label>}
                     {draft && sheet.scheduleWarning && (
                        <p className="rider-error" role="status">Add your class schedule first. <Link to="/driver/schedule">Add my schedule</Link></p>
                     )}
                     {!draft && <div className="rider-card">{renderAlertSummary(search, filters)}</div>}
                     <div className="rider-row">
                        {draft ? button("Show " + tripCount(matchingFilters(base, draft).length), () => {
                           setFilters(draft);
                           setSheet(null);
                        }, "primary") : button("Save alert", saveAlert, "primary")}
                        {button("Cancel", () => setSheet(null))}
                     </div>
                  </div>
               </dialog>
            )}
         </main>
      </>
   );
}

export default FindRide;

