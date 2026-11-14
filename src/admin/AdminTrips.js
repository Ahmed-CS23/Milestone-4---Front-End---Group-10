import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import data from "../shared/data";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import { Pill } from "./AdminUI";
import "./Admin.css";
import "./AdminTrips.css";

const PAGE_SIZE = 10;

// Colour for each trip state (same states as the driver pages)
const tones = { open: "green", full: "amber", awaiting: "blue", completed: "green", cancelled: "grey", removed: "red", expired: "grey" };

// WF-53 Trips: filter by status, date range, route, driver (FR-A3 steps 1–2)
function AdminTrips() {
   const navigate = useNavigate();

   // What is typed in the filter boxes
   const [inputs, setInputs] = useState({ status: "all", from: "", to: "", route: "", driver: "" });
   // The filters actually applied. Only changes when Search passes the checks.
   const [filters, setFilters] = useState(inputs);
   const [error, setError] = useState("");
   const [page, setPage] = useState(1);

   function handleChange(event) {
      const name = event.target.name;
      const value = event.target.value;
      setInputs(values => ({...values, [name]: value}));
   }

   function handleSearch(event) {
      event.preventDefault();
      if (inputs.from !== "" && inputs.to !== "" && inputs.to <= inputs.from) {
         setError("End date must be after the start date.");
         return;
      }
      setError("");
      setFilters(inputs);
      setPage(1);
   }

   // Build the list: newest departure first, then apply every filter
   const route = filters.route.trim().toLowerCase();
   const driver = filters.driver.trim().toLowerCase();
   const trips = data.trips
       .slice()
       .sort((a, b) => b.departure.localeCompare(a.departure))
       .filter(t => {
          const state = utils.getTripState(t);
          const day = t.departure.substring(0, 10);
          const routeText = (t.origin + " " + t.destination + " " + t.pickup).toLowerCase();
          const driverName = utils.getUserName(t.driverId).toLowerCase();
          return (filters.status === "all" || state === filters.status) &&
              (filters.from === "" || day >= filters.from) &&
              (filters.to === "" || day <= filters.to) &&
              (route === "" || routeText.includes(route)) &&
              (driver === "" || driverName.includes(driver));
       });

   // Pagination
   const pages = Math.max(1, Math.ceil(trips.length / PAGE_SIZE));
   const shown = trips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
   const first = trips.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
   const last = (page - 1) * PAGE_SIZE + shown.length;

   return (
       <AdminLayout title="Trips">
          {/* [1] Filters */}
          <form className="trips-filters" onSubmit={handleSearch} noValidate>
             <div className="trips-field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={inputs.status} onChange={handleChange}>
                   <option value="all">All</option>
                   {Object.keys(utils.stateText).map(s => <option key={s} value={s}>{utils.stateText[s]}</option>)}
                </select>
             </div>
             <div className="trips-field">
                <label htmlFor="from">From</label>
                <input type="date" id="from" name="from" value={inputs.from} onChange={handleChange} />
             </div>
             <div className="trips-field">
                <label htmlFor="to">To</label>
                <input type="date" id="to" name="to" value={inputs.to} onChange={handleChange} />
             </div>
             <div className="trips-field grow">
                <label htmlFor="route">Route</label>
                <input type="text" id="route" name="route" placeholder="Search route" value={inputs.route} onChange={handleChange} />
             </div>
             <div className="trips-field">
                <label htmlFor="driver">Driver</label>
                <input type="text" id="driver" name="driver" placeholder="Search driver" value={inputs.driver} onChange={handleChange} />
             </div>
             <input type="submit" className="trips-search" value="Search" />
          </form>

          {error && <p className="admin-error trips-error" role="alert">⚠ {error}</p>}

          {trips.length === 0 && <p className="admin-muted">No trips match these filters.</p>}

          {/* [2] Table: click a row to open the trip */}
          {trips.length > 0 && (
              <div className="admin-table-wrap">
                 <table className="admin-table trips-table">
                    <thead>
                    <tr><th>Trip</th><th>Departure</th><th>Route</th><th>Driver</th><th>Seats</th><th>Status</th><th>Reports</th></tr>
                    </thead>
                    <tbody>
                    {shown.map(t => {
                       const state = utils.getTripState(t);
                       const reports = data.reports.filter(r => r.tripId === t.id).length;
                       return (
                           <tr key={t.id} className={reports > 0 ? "flagged" : ""}
                               onClick={() => navigate("/admin/trips/" + t.id)}>
                              <td><Link to={"/admin/trips/" + t.id}>{t.id.toUpperCase()}</Link></td>
                              <td>{utils.formatDeparture(t.departure)}</td>
                              <td>{t.origin} → {t.destination}</td>
                              <td>{utils.getUserName(t.driverId)}</td>
                              <td>{t.seats - t.seatsLeft}/{t.seats}</td>
                              <td><Pill tone={tones[state]}>{utils.stateText[state]}</Pill></td>
                              <td>{reports}</td>
                           </tr>
                       );
                    })}
                    </tbody>
                 </table>
              </div>
          )}

          <div className="trips-pager">
             <span className="admin-muted">Showing {first}–{last} of {trips.length}</span>
             <div>
                <button type="button" className="admin-button secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button type="button" className="admin-button secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button>
             </div>
          </div>
       </AdminLayout>
   );
}

export default AdminTrips;