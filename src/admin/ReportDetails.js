import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Pill } from "./AdminUI";
import "./Admin.css";
import "./Reports.css";

// Outcomes (FR-A5 step 3, assumption A-23)
const outcomes = [
   { value: "dismiss", label: "Dismiss", short: "Dismiss" },
   { value: "warn", label: "Warn the subject", short: "Warn" },
   { value: "suspend", label: "Suspend the subject", short: "Suspend" },
   { value: "escalate", label: "Escalate to a senior administrator", short: "Escalate" }
];

const statusTones = { open: "blue", investigating: "blue", escalated: "amber", closed: "grey" };

// WF-55a investigation, WF-55b conflict of interest, WF-55d validation (FR-A5 steps 2–5)
function ReportDetails() {
   const navigate = useNavigate();
   const { reportId } = useParams();
   const report = data.reports.find(r => r.id === reportId);

   const [outcome, setOutcome] = useState("");
   const [note, setNote] = useState("");
   const [errors, setErrors] = useState({});
   const [message, setMessage] = useState("");

   if (!report) {
      return (
         <AdminLayout title="Reports">
            <Link className="admin-back" to="/admin/reports">← Reports</Link>
            <p className="admin-banner error">This report was not found.</p>
         </AdminLayout>
      );
   }

   const trip = data.trips.find(t => t.id === report.tripId);
   const reporterName = utils.getUserName(report.reporterId);
   const subjectName = utils.getUserName(report.subjectId);
   const reporterIsAdmin = admin.roleText(report.reporterId, report.tripId) === "admin";

   // An administrator may not act on a report they are part of (FR-A5 step 4)
   const isParty = report.reporterId === data.session.userId || report.subjectId === data.session.userId;
   const isClosed = report.status === "closed";

   // Subject history
   const ratings = data.ratings.filter(r => r.toId === report.subjectId && !r.deleted);
   const lateCancels = data.bookings.filter(b => b.riderId === report.subjectId && b.late).length;
   const earlier = data.reports.filter(r => r.subjectId === report.subjectId && r.id !== report.id);

   // Reporter history
   const reporterRatings = data.ratings.filter(r => r.toId === report.reporterId && !r.deleted);
   const filed = data.reports.filter(r => r.reporterId === report.reporterId);
   const upheld = filed.filter(r => r.outcome === "Warn" || r.outcome === "Suspend").length;

   function ratingText(list, userId) {
      const value = utils.getRatingValue(userId);
      return value === "" ? "No ratings yet" : value + " (" + list.length + ")";
   }

   // [2] Submit outcome (FR-A5 steps 4–5)
   function handleSubmit(event) {
      event.preventDefault();
      const newErrors = {};
      if (outcome === "") {
         newErrors.outcome = "Choose an outcome.";
      }
      if (note.trim() === "") {
         newErrors.note = "An outcome note is required.";
      }
      else if (note.length > 500) {
         newErrors.note = "Note must be 500 characters or fewer.";
      }
      setErrors(newErrors);
      if (newErrors.outcome || newErrors.note) {
         return;
      }
      if (report.status === "closed") {
         setMessage("This report was already closed by another administrator.");
         return;
      }

      // Suspend continues to the suspension form (WF-56b). The report closes when the suspension is confirmed.
      if (outcome === "suspend") {
         navigate("/admin/users/" + report.subjectId, { state: { suspendFor: report.id, reason: note.trim() } });
         return;
      }

      const chosen = outcomes.find(o => o.value === outcome);

      // Escalate moves the report to the Escalated queue instead of closing it (A-23)
      if (outcome === "escalate") {
         report.status = "escalated";
         report.note = note.trim();
         const entry = admin.addAudit("Escalated report", report.id, note.trim());
         navigate("/admin/reports", { state: { tab: "open", toast: report.id + " moved to the Escalated queue. Audit entry " + entry.id + " written." } });
         return;
      }

      // Dismiss or Warn: close the report and tell the people involved
      report.status = "closed";
      report.outcome = chosen.short;
      report.note = note.trim();
      report.closedBy = data.session.userId;

      admin.notify(report.reporterId, "report", "Report reviewed",
         "Your report " + report.id + " about " + subjectName + " was reviewed by an administrator.", "/account/notifications");
      let toast = report.id + " closed — outcome: " + chosen.short + ". " + reporterName + " was told it was reviewed;";
      if (outcome === "warn") {
         admin.notify(report.subjectId, "report", "Warning from UniRide",
            "An administrator reviewed a report about you (" + report.category + "): " + note.trim(), "/account/notifications");
         toast = toast + " " + subjectName + " was notified of the warning.";
      }
      else {
         toast = toast + " no action against " + subjectName + ".";
      }
      const entry = admin.addAudit("Closed report: " + chosen.short, report.id, note.trim());
      navigate("/admin/reports", { state: { tab: "open", toast: toast + " Audit entry " + entry.id + " written." } });
   }

   return (
      <AdminLayout title="Reports">
         <Link className="admin-back" to="/admin/reports">← Reports</Link>
         <h2 className="admin-title">{report.id} · {report.category} <Pill tone={statusTones[report.status]}>{report.status}</Pill></h2>

         {message && <p className="admin-banner error" role="alert">{message}</p>}

         <div className="report-grid">
            {/* Column 1: the report and its trip */}
            <div className="report-column">
               <section className="admin-panel">
                  <h2>Report</h2>
                  <div className="admin-row"><span>Reporter</span><span>{reporterName} ({admin.roleText(report.reporterId, report.tripId)})</span></div>
                  <div className="admin-row"><span>Subject</span><span>{subjectName} ({admin.roleText(report.subjectId, report.tripId)})</span></div>
                  <div className="admin-row"><span>Trip</span><span>{trip ? trip.id.toUpperCase() + " · " + utils.formatDeparture(trip.departure) : "No trip linked"}</span></div>
                  <div className="admin-row"><span>Submitted</span><span>{formatDate(report.date)}</span></div>
                  <div className="admin-row"><span>Description</span><span>“{report.details}”</span></div>
               </section>

               <section className="admin-panel">
                  <h2>Linked trip</h2>
                  {!trip && <p className="admin-muted">This report is not about a specific trip.</p>}
                  {trip && (
                     <>
                        <p className="admin-muted">
                           {trip.origin} → {trip.destination} · {utils.stateText[utils.getTripState(trip)]} ·{" "}
                           {data.bookings.filter(b => b.tripId === trip.id && b.status === "completed").length} riders travelled
                        </p>
                        <Link to={"/admin/trips/" + trip.id}>Open trip (admin view)</Link>
                     </>
                  )}
               </section>
            </div>

            {/* Column 2: both parties' histories */}
            <div className="report-column">
               <section className="admin-panel">
                  <h2>Subject history — {subjectName}</h2>
                  <div className="admin-row"><span>Rating</span><span>{ratingText(ratings, report.subjectId)}</span></div>
                  <div className="admin-row"><span>Completed trips</span><span>{utils.getCompletedCount(report.subjectId)}</span></div>
                  <div className="admin-row"><span>Late cancellations</span><span>{lateCancels}</span></div>
                  <div className="admin-row"><span>Earlier reports</span>
                     <span>{earlier.length === 0 ? "None" : earlier.map(r => (
                        <span key={r.id} style={{ display: "block" }}>{r.id} · {r.outcome || r.status} ({formatDate(r.date).slice(0, -5)})</span>
                     ))}</span>
                  </div>
                  <Link to={"/admin/users/" + report.subjectId}>Open user (admin view)</Link>
               </section>

               <section className="admin-panel">
                  <h2>{reporterIsAdmin ? "Reporter" : "Reporter history — " + reporterName}</h2>
                  <div className="admin-row"><span>Rating</span><span>{reporterIsAdmin ? "—" : ratingText(reporterRatings, report.reporterId)}</span></div>
                  <div className="admin-row"><span>Reports filed</span><span>{reporterIsAdmin ? "—" : filed.length + " (" + upheld + " upheld)"}</span></div>
               </section>
            </div>

            {/* Column 3: outcome */}
            <form className="admin-panel report-outcome" onSubmit={handleSubmit} noValidate>
               <h2>Outcome</h2>

               {isClosed && (
                  <p>Closed with outcome <strong>{report.outcome}</strong>{report.closedBy ? " by " + utils.getUserName(report.closedBy) : ""}.<br />
                     <span className="admin-hint">Note: {report.note}</span></p>
               )}

               {!isClosed && (
                  <>
                     {/* WF-55b */}
                     {isParty && (
                        <div className="admin-banner error" role="alert">
                           <strong>⚠ Conflict of interest</strong><br />
                           You are part of this report, so you can't decide its outcome. Another administrator must review it.
                        </div>
                     )}

                     <fieldset disabled={isParty}>
                        <legend className="admin-hint">Choose one</legend>
                        {outcomes
                           .filter(o => !(o.value === "escalate" && report.status === "escalated"))
                           .map(o => (
                              <label key={o.value} className="report-option">
                                 <input type="radio" name="outcome" value={o.value}
                                    checked={outcome === o.value} onChange={e => setOutcome(e.target.value)} />
                                 {o.label}
                              </label>
                           ))}
                        {errors.outcome && <p className="admin-error">⚠ {errors.outcome}</p>}

                        <label htmlFor="note"><strong>Outcome note *</strong></label>
                        <textarea id="note" rows="4" value={note} onChange={e => setNote(e.target.value)}
                           className={errors.note ? "invalid" : ""}></textarea>
                        {errors.note
                           ? <p className="admin-error">⚠ {errors.note}</p>
                           : <p className="admin-hint">Required · up to 500 characters · {note.length}/500</p>}

                        <button type="submit" className="admin-button primary">Submit outcome</button>
                     </fieldset>
                     <p className="admin-hint">Suspend continues to the suspension form (reason and duration).</p>
                  </>
               )}
            </form>
         </div>
      </AdminLayout>
   );
}

export default ReportDetails;
