import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import DriverGuard from "./DriverGuard";
import TopBar, { Banner, FieldError } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./RecurringTrips.css";

function shiftTime(time, minutes) {
   const total = Number(time.substring(0, 2)) * 60 + Number(time.substring(3, 5)) + minutes;
   return utils.pad(Math.floor(total / 60)) + ":" + utils.pad(total % 60);
}

function homePickup(area) {
   const match = utils.pickupPoints.find(p => p.indexOf(area) === 0);
   return match || "";
}

// FR-D3 step 5 and assumption A-12: a morning trip 45 min before the first class,
// and a return trip 15 min after the last class, for every class day.
function proposeTrips(schedule, seats) {
   const list = [];
   for (let d = 0; d < utils.days.length; d++) {
      const classes = schedule.filter(c => c.day === utils.days[d]);
      if (classes.length === 0) {
         continue;
      }
      let first = classes[0].start;
      let last = classes[0].end;
      for (let i = 1; i < classes.length; i++) {
         if (classes[i].start < first) {
            first = classes[i].start;
         }
         if (classes[i].end > last) {
            last = classes[i].end;
         }
      }
      list.push({ key: utils.days[d] + "-am", dayIndex: d, toCampus: true, classTime: first,
         time: shiftTime(first, -45), seats: seats, pickup: "", use: true, editing: false });
      list.push({ key: utils.days[d] + "-pm", dayIndex: d, toCampus: false, classTime: last,
         time: shiftTime(last, 15), seats: seats, pickup: "", use: true, editing: false });
   }
   return list;
}

// WF-39 · Generate recurring trips, WF-39a conflicts, WF-39b published (FR-D3 steps 5–8)
function RecurringTrips() {
   const user = utils.getSignedInUser();
   const capacity = user && user.vehicle ? user.vehicle.capacity : 1;
   const startSeats = "" + Math.min(3, capacity);
   const [route, setRoute] = useState({ home: "Al-Rakah", gate: "KFUPM Gate 2" });
   const [endDate, setEndDate] = useState(utils.termEnd);
   const [seats, setSeats] = useState(startSeats);
   const [proposals, setProposals] = useState(user ? proposeTrips(user.schedule, startSeats) : []);
   const [published, setPublished] = useState(null);

   if (!user || user.vehicleStatus !== "approved") {
      return <DriverGuard user={user} />;
   }

   if (published) {
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Recurring trips" back="/driver" />
               <div className="driver-result">
                  <p className="driver-result-icon" aria-hidden="true">✓</p>
                  <h2>{published.total} trips published</h2>
                  <p className="driver-muted">{published.days} from {published.from} to {published.to}, {published.weekly} trips a week. Riders can now find them on the board.</p>
               </div>
               <Link className="driver-button" to="/driver/trips">View in My Trips</Link>
               <Link className="driver-secondary" to="/driver">Back to dashboard</Link>
            </div>
         </div>
      );
   }

   if (user.schedule.length === 0) {
      return (
         <div>
            <NavBar />
            <div className="driver-card">
               <TopBar title="Recurring trips" back="/driver" />
               <div className="driver-result">
                  <p className="driver-result-icon" aria-hidden="true">🗓</p>
                  <h2>Add your schedule first</h2>
                  <p className="driver-muted">Recurring trips are proposed from your class times.</p>
               </div>
               <Link className="driver-button" to="/driver/schedule">Go to My Schedule</Link>
            </div>
         </div>
      );
   }

   function change(key, name, value) {
      setProposals(proposals.map(p => (p.key === key ? {...p, [name]: value} : p)));
   }

   function changeSeats(value) {
      setSeats(value);
      setProposals(proposals.map(p => ({...p, seats: value})));
   }

   function pickupOf(p) {
      if (p.pickup !== "") {
         return p.pickup;
      }
      return p.toCampus ? homePickup(route.home) || utils.pickupPoints[0] : route.gate;
   }

   // Every date from tomorrow to the end date, for each ticked proposal.
   function occurrences(p) {
      const list = [];
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + 1);
      const last = new Date((endDate <= utils.termEnd ? endDate : utils.termEnd) + "T23:59");
      while (day <= last) {
         if (day.getDay() === p.dayIndex) {
            list.push(utils.toInputValue(day).substring(0, 10) + "T" + p.time);
         }
         day.setDate(day.getDate() + 1);
      }
      return list;
   }

   // FR-D3 step 7: end date inside the term; no clash with published trips (60 minutes).
   const today = utils.toInputValue(new Date()).substring(0, 10);
   let dateError = "";
   if (endDate === "" || endDate <= today) {
      dateError = "Choose a date after today.";
   }
   else if (endDate > utils.termEnd) {
      dateError = "Must be on or before " + utils.formatDate(utils.termEnd) + " (end of Term 261).";
   }
   const clashes = {};
   let total = 0;
   let firstDate = "";
   for (let i = 0; i < proposals.length; i++) {
      const p = proposals[i];
      if (!p.use) {
         continue;
      }
      const dates = occurrences(p);
      total = total + dates.length;
      for (let k = 0; k < dates.length; k++) {
         if (firstDate === "" || dates[k] < firstDate) {
            firstDate = dates[k];
         }
         const clash = utils.findConflict(user.id, dates[k], null);
         if (clash && !clashes[p.key]) {
            clashes[p.key] = "Clashes with your published trip on " + utils.formatDeparture(clash.departure).replace(" · ", ", ") +
               " (" + clash.origin + " → " + clash.destination + ") — within 60 minutes.";
         }
      }
   }
   const clashCount = Object.keys(clashes).length;
   const weekly = proposals.filter(p => p.use).length;
   const routeError = route.home === "" ? "Choose the area you drive from." : "";
   const blocked = dateError !== "" || clashCount > 0 || weekly === 0 || routeError !== "" || total === 0;

   function handlePublish() {
      if (blocked) {
         return;
      }
      // All or nothing (NFR-12): every occurrence was checked above before anything is saved.
      const seriesId = utils.newId("s");
      const usedDays = [];
      for (let i = 0; i < proposals.length; i++) {
         const p = proposals[i];
         if (!p.use) {
            continue;
         }
         if (usedDays.indexOf(p.dayIndex) === -1) {
            usedDays.push(p.dayIndex);
         }
         const dates = occurrences(p);
         for (let k = 0; k < dates.length; k++) {
            data.trips.push({
               id: utils.newId("t"),
               driverId: user.id,
               origin: p.toCampus ? route.home : route.gate,
               destination: p.toCampus ? route.gate : route.home,
               pickup: pickupOf(p),
               departure: dates[k],
               seats: Number(p.seats),
               seatsLeft: Number(p.seats),
               note: "",
               status: "open",
               seriesId: seriesId
            });
         }
      }
      setPublished({
         total: total,
         weekly: weekly,
         days: utils.seriesDays(seriesId),
         from: utils.formatDay(firstDate),
         to: utils.formatDay(endDate + "T12:00")
      });
   }

   const seatOptions = [];
   for (let n = 1; n <= capacity; n++) {
      seatOptions.push(n);
   }

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="Recurring trips" back="/driver/schedule" />

            {(clashCount > 0 || dateError !== "") && (
               <Banner type="error" title="Can’t publish yet">
                  <p>
                     {clashCount > 0 && clashCount + (clashCount === 1 ? " proposed trip clashes" : " proposed trips clash") + " with trips you already published"}
                     {clashCount > 0 && dateError !== "" && ", and "}
                     {dateError !== "" && (clashCount > 0 ? "the end date is outside the term" : "The end date is outside the term")}
                     . Fix {clashCount + (dateError !== "" ? 1 : 0) === 1 ? "this" : "these"} to publish.
                  </p>
               </Banner>
            )}

            <h2>Proposed from your schedule</h2>
            <p className="driver-hint">One morning trip per class day and one return trip after your last class. Adjust anything before publishing.</p>

            <div className="driver-pair-row">
               <div className="driver-field">
                  <label htmlFor="home">You drive from *</label>
                  <select id="home" value={route.home} onChange={e => setRoute({...route, home: e.target.value})}>
                     <option value="">Select an area</option>
                     {utils.areas.filter(a => a.indexOf("KFUPM") !== 0).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <FieldError text={routeError} />
               </div>
               <div className="driver-field">
                  <label htmlFor="gate">Campus gate</label>
                  <select id="gate" value={route.gate} onChange={e => setRoute({...route, gate: e.target.value})}>
                     {utils.areas.filter(a => a.indexOf("KFUPM") === 0).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
               </div>
            </div>

            <div className="driver-pair-row">
               <div className="driver-field driver-grow">
                  <label htmlFor="endDate">Recurrence ends *</label>
                  <input type="date" id="endDate" className={dateError ? "driver-invalid" : ""} value={endDate}
                     onChange={e => setEndDate(e.target.value)} />
               </div>
               <div className="driver-field">
                  <label htmlFor="seats">Seats</label>
                  <select id="seats" value={seats} onChange={e => changeSeats(e.target.value)}>
                     {seatOptions.map(n => <option key={n} value={"" + n}>{n}</option>)}
                  </select>
               </div>
            </div>
            {dateError ? <FieldError text={dateError} /> : <p className="driver-hint">On or before the end of Term 261 ({utils.formatDate(utils.termEnd)})</p>}

            {proposals.map(p => (
               <div key={p.key} className={clashes[p.key] && p.use ? "driver-box driver-clash" : "driver-box"}>
                  <label className="driver-proposal-title">
                     <input type="checkbox" checked={p.use} onChange={e => change(p.key, "use", e.target.checked)} />
                     <span>{utils.days[p.dayIndex]} · {p.toCampus ? "Morning" : "Return"} · {utils.formatTime(p.time)}</span>
                  </label>
                  <p className="driver-hint">
                     {p.toCampus ? route.home + " → " + route.gate : route.gate + " → " + route.home}
                     {" · "}{p.toCampus ? "first class " : "last class ends "}{utils.formatTime(p.toCampus ? p.classTime : p.classTime)}
                  </p>
                  {clashes[p.key] && p.use && (
                     <>
                        <FieldError text={clashes[p.key]} />
                        <div className="driver-inline-links">
                           <button type="button" className="driver-text-link" onClick={() => change(p.key, "editing", true)}>Change time</button>
                           <button type="button" className="driver-text-link" onClick={() => change(p.key, "use", false)}>Untick</button>
                        </div>
                     </>
                  )}
                  {p.editing ? (
                     <div className="driver-proposal-edit">
                        <div className="driver-pair-row">
                           <div className="driver-field driver-grow">
                              <label htmlFor={"time-" + p.key}>Departure time</label>
                              <input type="time" id={"time-" + p.key} value={p.time} onChange={e => change(p.key, "time", e.target.value)} />
                           </div>
                           <div className="driver-field">
                              <label htmlFor={"seats-" + p.key}>Seats</label>
                              <select id={"seats-" + p.key} value={p.seats} onChange={e => change(p.key, "seats", e.target.value)}>
                                 {seatOptions.map(n => <option key={n} value={"" + n}>{n}</option>)}
                              </select>
                           </div>
                        </div>
                        <div className="driver-field">
                           <label htmlFor={"pickup-" + p.key}>Pickup point</label>
                           <select id={"pickup-" + p.key} value={pickupOf(p)} onChange={e => change(p.key, "pickup", e.target.value)}>
                              {utils.pickupPoints.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                           </select>
                        </div>
                        <button type="button" className="driver-text-link" onClick={() => change(p.key, "editing", false)}>Done</button>
                     </div>
                  ) : (
                     !clashes[p.key] && <button type="button" className="driver-text-link driver-left" onClick={() => change(p.key, "editing", true)}>Edit</button>
                  )}
               </div>
            ))}

            <div className="driver-summary">
               <p className="driver-strong">{weekly} weekly trips{firstDate !== "" && endDate !== "" ? " · " + utils.formatDay(firstDate) + " – " + utils.formatDate(endDate <= utils.termEnd ? endDate : utils.termEnd) : ""}</p>
               <p className="driver-hint">{total} trips will be published, each open on the board.</p>
            </div>
            <button type="button" className="driver-button" disabled={blocked} onClick={handlePublish}>Publish {total} trips</button>
         </div>
      </div>
   );
}

export default RecurringTrips;
