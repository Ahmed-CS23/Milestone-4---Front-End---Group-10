import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Toast, Pill, Modal } from "./AdminUI";
import "./Admin.css";
import "./AdminTrips.css";

const reasons = [
   "Requests money or payment",
   "Misleading or unsafe trip details",
   "Duplicate or spam posting",
   "Inappropriate content",
   "Other rule violation"
];

const tripTones = { open: "green", full: "amber", awaiting: "blue", completed: "green", cancelled: "grey", removed: "red", expired: "grey" };
const bookingTones = { accepted: "green", pending: "blue", completed: "green", declined: "grey", cancelled: "grey", no_show: "red", expired: "grey" };

// WF-53a detail, WF-54 remove dialog, WF-54a removed, WF-54b completed: annotate only (FR-A3, FR-A4)
function AdminTripDetails() {
   const { tripId } = useParams();
   const trip = data.trips.find(t => t.id === tripId);

   const [viewEntry, setViewEntry] = useState(null);
   const [showRemove, setShowRemove] = useState(false);
   const [reason, setReason] = useState("");
   const [note, setNote] = useState("");
   const [annotation, setAnnotation] = useState("");
   const [errors, setErrors] = useState({});
   const [toast, setToast] = useState("");

   // Every trip opened is written to the audit log (FR-A3 step 4)
   useEffect(() => {
      if (!trip || !admin.getAdmin()) {
         return;
      }
      // In development React runs this twice, so reuse an entry written in the last 2 seconds
      const recent = data.auditLog.find(a => a.action === "Opened trip" && a.targetId === trip.id &&
          a.adminId === data.session.userId && Date.now() - new Date(a.date).getTime() < 2000);
      setViewEntry(recent || admin.addAudit("Opened trip", trip.id, ""));
   }, [tripId]);

   if (!trip) {
      return (
          <AdminLayout title="Trips">
             <Link className="admin-back" to="/admin/trips">← Trips</Link>
             <p className="admin-banner error">This trip was not found.</p>
          </AdminLayout>
      );
   }

   const state = utils.getTripState(trip);
   const bookings = data.bookings.filter(b => b.tripId === trip.id);
   const accepted = bookings.filter(b => b.status === "accepted");
   const pending = bookings.filter(b => b.status === "pending");
   const reports = data.reports.filter(r => r.tripId === trip.id);
   const canRemove = state === "open" || state === "full" || state === "awaiting";
   const driverName = utils.getUserName(trip.driverId);

   // [3] Remove trip (FR-A4 steps 3–5)
   function handleRemove() {
      const newErrors = {};
      if (reason === "") {
         newErrors.reason = "Choose a reason for removing this trip.";
      }
      if (note.length > 500) {
         newErrors.note = "Note must be 500 characters or fewer.";
      }
      setErrors(newErrors);
      if (newErrors.reason || newErrors.note) {
         return;
      }

      const message = "Removed by an administrator. Reason: " + reason + (note.trim() ? " — " + note.trim() : "");

      // Cancelling the bookings releases the held credits (team rule: held = pending or accepted bookings)
      const affected = accepted.concat(pending);
      affected.forEach(b => {
         b.status = "cancelled";
         b.cancelledBy = "admin";
         admin.notify(b.riderId, "changed", "Trip removed",
             "The trip on " + utils.formatDeparture(trip.departure) + " was removed. " + message + ". Your held credit is back in your balance.", "/rider");
      });
      admin.notify(trip.driverId, "changed", "Trip removed",
          "Your trip on " + utils.formatDeparture(trip.departure) + " was removed. " + message + ".", "/driver/trips");

      const entry = admin.addAudit("Removed trip", trip.id, reason);
      trip.status = "removed";
      trip.seatsLeft = trip.seats;
      trip.removal = { adminId: data.session.userId, reason: reason, note: note.trim(), auditId: entry.id };

      setShowRemove(false);
      setToast("Trip removed. Driver and " + affected.length + (affected.length === 1 ? " rider" : " riders") +
          " notified; held credits released; audit entry " + entry.id + " written.");
   }

   // WF-54b: completed trips can only be annotated (visible to administrators only)
   function handleAnnotate() {
      const text = annotation.trim();
      if (text === "" || text.length > 500) {
         setErrors({ annotation: text === "" ? "Write an annotation first." : "Annotation must be 500 characters or fewer." });
         return;
      }
      setErrors({});
      if (!trip.adminNotes) {
         trip.adminNotes = [];
      }
      trip.adminNotes.push({ adminId: data.session.userId, text: text, date: new Date().toISOString() });
      admin.addAudit("Annotated trip", trip.id, text);
      setAnnotation("");
      setToast("Annotation saved.");
   }

   function closeRemove() {
      setShowRemove(false);
      setErrors({});
   }

   // Heading pill: seats filled while the trip is live, otherwise the state
   let headerPill = <Pill tone={tripTones[state]}>{utils.stateText[state]}</Pill>;
   if (state === "open" || state === "full") {
      headerPill = <Pill tone="green">{(trip.seats - trip.seatsLeft) + " of " + trip.seats + " seats filled"}</Pill>;
   }

   let subLine = trip.origin + " → " + trip.destination + " · Driver " + driverName + " · Pickup: " + trip.pickup;
   if (state === "completed") {
      const travelled = bookings.filter(b => b.status === "completed").length;
      const noShow = bookings.filter(b => b.status === "no_show").length;
      subLine = trip.origin + " → " + trip.destination + " · Driver " + driverName + " · " + travelled + " travelled, " + noShow + " did not travel";
   }

   const removedBy = trip.removal ? utils.getUserName(trip.removal.adminId) : "";
   const viewer = viewEntry ? utils.getUserName(viewEntry.adminId) : "";

   return (
       <AdminLayout title="Trips">
          <Toast text={toast} />
          <Link className="admin-back" to="/admin/trips">← Trips</Link>
          <h2 className="admin-title">{trip.id.toUpperCase()} · {utils.formatDeparture(trip.departure)} {headerPill}</h2>
          <p className="trip-sub">{subLine}</p>

          {viewEntry && (
              <p className="admin-banner info">ⓘ Opening this trip was recorded in the audit log ({viewer}, {formatDate(viewEntry.date)}, entry {viewEntry.id}).</p>
          )}

          {/* WF-54b */}
          {state === "completed" && (
              <>
                 <p className="admin-banner info">ⓘ Completed trips can't be removed, only annotated.</p>
                 <section className="admin-panel trip-annotate">
                    <h2>Add annotation (visible to administrators only)</h2>
                    {(trip.adminNotes || []).map((n, i) => (
                        <p key={i} className="admin-hint">{utils.getUserName(n.adminId)} · {formatDate(n.date)}: {n.text}</p>
                    ))}
                    <textarea rows="3" value={annotation} onChange={e => setAnnotation(e.target.value)} aria-label="Annotation"></textarea>
                    {errors.annotation
                        ? <p className="admin-error">⚠ {errors.annotation}</p>
                        : <p className="admin-hint">Up to 500 characters · {annotation.length}/500</p>}
                    <button type="button" className="admin-button primary" onClick={handleAnnotate}>Save annotation</button>
                 </section>
              </>
          )}

          <div className="trip-grid">
             <div className="trip-column">
                <section className="admin-panel">
                   <h2>Trip details</h2>
                   <div className="admin-row"><span>Seats</span><span>{trip.seats} offered · {accepted.length} accepted · {pending.length} pending</span></div>
                   <div className="admin-row"><span>Driver's note</span><span>{trip.note ? "“" + trip.note + "”" : "—"}</span></div>
                   <div className="admin-row"><span>Status</span><span>{utils.stateText[state]}</span></div>
                </section>

                <section className="admin-panel">
                   <h2>Passengers and requests</h2>
                   {bookings.length === 0 && <p className="admin-muted">No requests yet.</p>}
                   {bookings.length > 0 && (
                       <div className="admin-table-wrap">
                          <table className="admin-table">
                             <thead><tr><th>Rider</th><th>Status</th><th>Note</th></tr></thead>
                             <tbody>
                             {bookings.map(b => (
                                 <tr key={b.id}>
                                    <td>{utils.getUserName(b.riderId)}</td>
                                    <td><Pill tone={bookingTones[b.status]}>{b.status.replace("_", "-")}</Pill></td>
                                    <td>{b.note || "—"}</td>
                                 </tr>
                             ))}
                             </tbody>
                          </table>
                       </div>
                   )}
                </section>
             </div>

             <div className="trip-column">
                <section className="admin-panel">
                   <h2>Reports ({reports.length})</h2>
                   {reports.length === 0 && <p className="admin-muted">No reports on this trip.</p>}
                   {reports.map(r => (
                       <Link key={r.id} className="trip-report" to={"/admin/reports/" + r.id}>
                          <strong>{r.id} · {r.category}</strong>
                          <p>“{r.details}” — {utils.getUserName(r.reporterId)}</p>
                       </Link>
                   ))}
                </section>

                <section className="admin-panel trip-moderation">
                   <h2>Moderation</h2>
                   {canRemove && (
                       <button type="button" className="admin-button danger" onClick={() => setShowRemove(true)}>Remove trip…</button>
                   )}
                   {state === "completed" && (
                       <button type="button" className="admin-button danger" disabled>Remove trip…</button>
                   )}
                   {state === "removed" && trip.removal && (
                       <p>Removed by {removedBy} · Reason: {trip.removal.reason}<br />
                          <span className="admin-hint">Audit entry {trip.removal.auditId}</span></p>
                   )}
                   {(state === "cancelled" || state === "expired") && (
                       <p className="admin-muted">This trip is {utils.stateText[state].toLowerCase()}. There is nothing to remove.</p>
                   )}
                   <Link to={"/admin/users/" + trip.driverId}>Open driver (admin view)</Link>
                </section>
             </div>
          </div>

          {/* WF-54: remove dialog */}
          {showRemove && (
              <Modal title={"Remove trip " + trip.id.toUpperCase() + "?"} onClose={closeRemove}>
                 <label htmlFor="reason">Reason *</label>
                 <select id="reason" value={reason} onChange={e => setReason(e.target.value)} className={errors.reason ? "invalid" : ""}>
                    <option value="">Select a reason</option>
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
                 {errors.reason && <p className="admin-error">⚠ {errors.reason}</p>}

                 <label htmlFor="note">Note (optional)</label>
                 <textarea id="note" rows="3" value={note} onChange={e => setNote(e.target.value)} className={errors.note ? "invalid" : ""}></textarea>
                 {errors.note
                     ? <p className="admin-error">⚠ {errors.note}</p>
                     : <p className="admin-hint">Sent to the driver and riders · {note.length}/500 characters</p>}

                 <div className="trip-warning">
                    <strong>⚠ {accepted.length + pending.length + 1} {accepted.length + pending.length + 1 === 1 ? "person" : "people"} affected</strong>
                    {accepted.length + pending.length} {accepted.length + pending.length === 1 ? "rider" : "riders"} ({accepted.length} accepted, {pending.length} pending) and the driver will be notified with the reason. All held credits will be released and an audit entry written.
                 </div>

                 <div className="admin-modal-actions">
                    <button type="button" className="admin-button secondary" onClick={closeRemove}>Cancel</button>
                    <button type="button" className="admin-button danger" onClick={handleRemove}>Remove trip</button>
                 </div>
              </Modal>
          )}
       </AdminLayout>
   );
}

export default AdminTripDetails;