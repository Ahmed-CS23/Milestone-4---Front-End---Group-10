import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Toast } from "./AdminUI";
import "./Admin.css";
import "./Reports.css";

// WF-55 Reports list, WF-55c toast after an outcome, WF-55M mobile cards (FR-A5 step 1)
function Reports() {
   const location = useLocation();
   const fromDetail = location.state || {};
   const [tab, setTab] = useState(fromDetail.tab || "open");

   // Newest first
   const all = data.reports.slice().sort((a, b) => b.date.localeCompare(a.date));
   // auth/Report.js uses "open"; "investigating" also counts as open
   const open = all.filter(r => r.status === "open" || r.status === "investigating");
   const escalated = all.filter(r => r.status === "escalated");
   const closed = all.filter(r => r.status === "closed");

   let list = open;
   if (tab === "escalated") {
      list = escalated;
   }
   else if (tab === "closed") {
      list = closed;
   }

   // "Faisal A. (rider)"
   function person(userId, tripId) {
      return utils.getUserName(userId) + " (" + admin.roleText(userId, tripId) + ")";
   }

   return (
      <AdminLayout title="Reports">
         <Toast text={fromDetail.toast} />

         <div className="admin-tabs">
            <button type="button" className={tab === "open" ? "active" : ""} onClick={() => setTab("open")}>Open ({open.length})</button>
            <button type="button" className={tab === "escalated" ? "active" : ""} onClick={() => setTab("escalated")}>Escalated ({escalated.length})</button>
            <button type="button" className={tab === "closed" ? "active" : ""} onClick={() => setTab("closed")}>Closed</button>
         </div>

         <p className="admin-muted">Newest first. Open a report to see the linked trip, both parties' histories and earlier reports.</p>

         {list.length === 0 && <p className="admin-muted">No reports here.</p>}

         {/* Desktop: table */}
         {list.length > 0 && (
            <div className="admin-table-wrap reports-desktop">
               <table className="admin-table">
                  <thead>
                     <tr><th>Report</th><th>Submitted</th><th>Reporter</th><th>Subject</th><th>Trip</th><th>Category</th>
                        {tab === "closed" && <th>Outcome</th>}<th></th></tr>
                  </thead>
                  <tbody>
                     {list.map(r => (
                        <tr key={r.id}>
                           <td>{r.id}</td>
                           <td>{formatDate(r.date)}</td>
                           <td>{person(r.reporterId, r.tripId)}</td>
                           <td>{person(r.subjectId, r.tripId)}</td>
                           <td>{r.tripId ? r.tripId.toUpperCase() : "—"}</td>
                           <td>{r.category}</td>
                           {tab === "closed" && <td>{r.outcome}</td>}
                           <td><Link to={"/admin/reports/" + r.id}>Open</Link></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {/* Mobile (< 600px): cards instead of a table (WF-55M) */}
         <div className="reports-mobile">
            {list.map(r => (
               <Link key={r.id} className="reports-card" to={"/admin/reports/" + r.id}>
                  <div className="reports-card-top">
                     <strong>{r.id}</strong>
                     <span>{formatDate(r.date).slice(0, -5)}</span>
                  </div>
                  <span>{r.category} · {utils.getUserName(r.reporterId)} → {utils.getUserName(r.subjectId)}</span>
                  {r.tripId && <span className="admin-hint">Trip {r.tripId.toUpperCase()}</span>}
               </Link>
            ))}
         </div>
      </AdminLayout>
   );
}

export default Reports;
