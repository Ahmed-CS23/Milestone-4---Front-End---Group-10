import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import "./AdminDashboard.css";

// ---------- Part 1: work out every number for a date range (FR-A8 step 2) ----------
function getStats(from, to) {
   // Trips that depart inside the range
   const trips = data.trips.filter(t => admin.inRange(t.departure, from, to));
   const tripIds = trips.map(t => t.id);

   // Seats filled = accepted or completed bookings on those trips
   const seats = data.bookings.filter(b => tripIds.includes(b.tripId) &&
       (b.status === "accepted" || b.status === "completed"));

   // Completion rate = completed ÷ departed
   const now = new Date();
   const departed = trips.filter(t => new Date(t.departure) < now &&
       t.status !== "cancelled" && t.status !== "removed");
   const completed = departed.filter(t => t.status === "completed");

   // New verified accounts = starting credits given in the range (FR-R1 step 6 gives them on verification)
   const newAccounts = data.credits.filter(c => c.type === "starting" && admin.inRange(c.date, from, to));

   // Credits in circulation = sum of every user's balance (same rule as driverUtils.getBalance)
   let credits = 0;
   for (let i = 0; i < data.credits.length; i++) {
      const c = data.credits[i];
      if (c.type === "starting" || c.type === "earned" || c.type === "spent" || c.type === "admin") {
         credits = credits + c.amount;
      }
   }

   // Top routes: group trips by "origin → destination"
   const routes = {};
   trips.forEach(t => {
      const name = t.origin + " → " + t.destination;
      if (!routes[name]) {
         routes[name] = { name: name, trips: 0, seats: 0 };
      }
      routes[name].trips = routes[name].trips + 1;
      routes[name].seats = routes[name].seats + seats.filter(b => b.tripId === t.id).length;
   });
   const topRoutes = Object.values(routes).sort((a, b) => b.trips - a.trips).slice(0, 5);

   // Seats filled per day, for the bar chart
   const perDay = {};
   seats.forEach(b => {
      const trip = trips.find(t => t.id === b.tripId);
      const day = trip.departure.substring(0, 10);
      perDay[day] = (perDay[day] || 0) + 1;
   });
   const days = Object.keys(perDay).sort().map(day => ({ day: day, seats: perDay[day] }));

   const openReports = data.reports.filter(r => r.status !== "closed");

   return {
      activeTrips: trips.filter(t => t.status === "open" || t.status === "full").length,
      seatsFilled: seats.length,
      completionRate: departed.length > 0 ? Math.round(completed.length / departed.length * 100) + "%" : "—",
      credits: credits,
      newAccounts: newAccounts.length,
      openReports: openReports.length,
      escalated: openReports.filter(r => r.status === "escalated").length,
      pendingVerifications: data.users.filter(u => u.vehicleStatus === "pending").length,
      pendingApprovals: data.creditApprovals.filter(a => a.status === "pending").length,
      topRoutes: topRoutes,
      days: days,
      hasData: trips.length > 0 || newAccounts.length > 0
   };
}

// ---------- Part 2: the page ----------
function AdminDashboard() {
   // What is typed in the date boxes
   const [from, setFrom] = useState(admin.termStart);
   const [to, setTo] = useState(admin.termEnd);
   // The range the numbers are showing. Only changes when Apply passes the checks (WF-51b).
   const [range, setRange] = useState({ from: admin.termStart, to: admin.termEnd });
   const [rangeError, setRangeError] = useState("");
   const [exporting, setExporting] = useState(false);
   const [toast, setToast] = useState("");

   const stats = getStats(range.from, range.to);
   const termText = "Term 261 (" + formatDate(admin.termStart) + " – " + formatDate(admin.termEnd) + ")";

   // [1] Apply: start before end, inside the term (FR-A8 step 3)
   function handleApply() {
      setToast("");
      if (from === "" || to === "") {
         setRangeError("Choose a start and an end date.");
      }
      else if (to <= from) {
         setRangeError("End date must be after the start date.");
      }
      else if (from < admin.termStart || to > admin.termEnd) {
         setRangeError("Choose dates within " + termText + ".");
      }
      else {
         setRangeError("");
         setRange({ from: from, to: to });
      }
   }

   // Empty state button (WF-51a)
   function handleReset() {
      setFrom(admin.termStart);
      setTo(admin.termEnd);
      setRangeError("");
      setRange({ from: admin.termStart, to: admin.termEnd });
   }

   function handleExport() {
      setExporting(true);
      setToast("");

      const rows = [
         ["Statistic", "Value"],
         ["From", range.from],
         ["To", range.to],
         ["Active trips", stats.activeTrips],
         ["Seats filled", stats.seatsFilled],
         ["Completion rate", stats.completionRate],
         ["Credits in circulation", stats.credits],
         ["New verified accounts", stats.newAccounts],
         ["Open reports", stats.openReports],
         ["Pending verifications", stats.pendingVerifications]
      ];
      stats.topRoutes.forEach(r => rows.push(["Route: " + r.name, r.trips + " trip(s), " + r.seats + " seat(s)"]));

      const csv = rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(",")).join("\n");
      const fileName = "uniride-stats-" + range.from + "-to-" + range.to + ".csv";

      // Short wait so "Generating CSV…" is visible, then download the file
      setTimeout(() => {
         const link = document.createElement("a");
         link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
         link.download = fileName;
         link.click();
         setExporting(false);
         setToast("CSV exported · " + fileName);
      }, 500);
   }

   const maxSeats = Math.max(1, ...stats.days.map(d => d.seats));

   return (
       <AdminLayout title="Dashboard">

          {/* BOX A: date range + export */}
          <div className="dash-toolbar">
             <div className="dash-field">
                <label htmlFor="from">From</label>
                <input type="date" id="from" value={from} onChange={e => setFrom(e.target.value)} />
             </div>
             <div className="dash-field">
                <label htmlFor="to">To</label>
                <input type="date" id="to" value={to} onChange={e => setTo(e.target.value)} />
             </div>
             <button type="button" className="dash-button" onClick={handleApply}>Apply</button>
             <button type="button" className="dash-button dash-export" onClick={handleExport}
                     disabled={exporting || !stats.hasData}>
                {exporting ? "Generating CSV…" : "Export CSV"}
             </button>
          </div>

          {rangeError && <p className="dash-error" role="alert">⚠ {rangeError} Statistics were not refreshed.</p>}
          {toast && <p className="dash-toast" role="status">✓ {toast}</p>}

          {!stats.hasData && (
              <div className="dash-empty">
                 <h2>No data for this date range</h2>
                 <p>No trips, bookings or new accounts were recorded between {formatDate(range.from)} and {formatDate(range.to)}. Choose another range.</p>
                 <button type="button" className="dash-button" onClick={handleReset}>Reset to this term</button>
              </div>
          )}

          {stats.hasData && (
              <>
                 {/* BOX B: stat tiles */}
                 <div className="dash-tiles four">
                    <Tile label="Active trips" value={stats.activeTrips} hint="Open or full in range" />
                    <Tile label="Seats filled" value={stats.seatsFilled} hint="Accepted bookings" />
                    <Tile label="Completion rate" value={stats.completionRate} hint="Completed ÷ departed" />
                    <Tile label="Credits in circulation" value={stats.credits} hint="Sum of all balances" />
                 </div>
                 <div className="dash-tiles three">
                    <Tile label="New verified accounts" value={stats.newAccounts} hint="Email verified in range" />
                    <Tile label="Open reports" value={stats.openReports} hint={stats.escalated + " escalated"} />
                    <Tile label="Pending verifications" value={stats.pendingVerifications} hint="Vehicles awaiting review" />
                 </div>

                 <div className="dash-bottom">
                    {/* BOX C: top routes */}
                    <section className="dash-panel">
                       <h2>Top routes</h2>
                       <table className="dash-table">
                          <thead>
                          <tr><th>Route</th><th>Trips</th><th>Seats</th></tr>
                          </thead>
                          <tbody>
                          {stats.topRoutes.map(r => (
                              <tr key={r.name}><td>{r.name}</td><td>{r.trips}</td><td>{r.seats}</td></tr>
                          ))}
                          </tbody>
                       </table>
                    </section>

                    {/* BOX C: seats filled per day */}
                    <section className="dash-panel">
                       <h2>Seats filled per day</h2>
                       {stats.days.length === 0 && <p className="dash-muted">No seats were filled in this range.</p>}
                       <div className="dash-chart">
                          {stats.days.map(d => (
                              <div key={d.day} className="dash-bar-col">
                                 <span className="dash-bar-value">{d.seats}</span>
                                 <div className="dash-bar" style={{ height: (d.seats / maxSeats * 100) + "%" }}></div>
                                 <span className="dash-bar-label">{formatDate(d.day).slice(0, -5)}</span>
                              </div>
                          ))}
                       </div>
                    </section>

                    {/* BOX D: needs attention [3] */}
                    <section className="dash-panel">
                       <h2>Needs attention</h2>
                       <AttentionRow label="Pending verifications" count={stats.pendingVerifications} to="/admin/verifications" />
                       <AttentionRow label="Open reports" count={stats.openReports} to="/admin/reports" />
                       <AttentionRow label="Credit adjustments to approve" count={stats.pendingApprovals} to="/admin/ratings" />
                    </section>
                 </div>
              </>
          )}
       </AdminLayout>
   );
}

// ---------- Part 3: small pieces used above ----------
function Tile(props) {
   return (
       <div className="dash-tile">
          <span className="dash-muted">{props.label}</span>
          <strong>{props.value}</strong>
          <span className="dash-hint">{props.hint}</span>
       </div>
   );
}

function AttentionRow(props) {
   return (
       <div className="dash-attention">
          <span>{props.label}</span>
          <Link to={props.to}>{props.count} · Review</Link>
       </div>
   );
}

export default AdminDashboard;
