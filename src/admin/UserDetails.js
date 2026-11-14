import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Toast, Pill, Modal } from "./AdminUI";
import "./Admin.css";
import "./Users.css";

// Date n days from today, as "2026-11-21"
function daysFromToday(n) {
   const d = new Date();
   d.setDate(d.getDate() + n);
   return d.getFullYear() + "-" + utils.pad(d.getMonth() + 1) + "-" + utils.pad(d.getDate());
}

// Suspension durations (assumption A-22). "until" is the last day, or "" for until reactivated.
function getDurations() {
   const week = daysFromToday(7);
   const month = daysFromToday(30);
   return [
      { value: "7", label: "7 days (until " + utils.formatDay(week + "T12:00") + ")", until: week },
      { value: "30", label: "30 days (until " + utils.formatDay(month + "T12:00") + ")", until: month },
      { value: "term", label: "Until the end of the term (" + utils.formatDay(admin.termEnd + "T12:00") + " 2026)", until: admin.termEnd },
      { value: "manual", label: "Until reactivated", until: "" }
   ];
}

const reportTones = { open: "blue", investigating: "blue", escalated: "amber", closed: "grey" };

// WF-56a detail, 56b suspend, 56c suspended, 56d reactivate, 56e not allowed (FR-A6)
function UserDetails() {
   const { userId } = useParams();
   const location = useLocation();
   // Coming from a report with outcome "Suspend": open the form with the outcome note as the reason
   const fromReport = location.state || {};
   const user = data.users.find(u => u.id === userId);

   const [dialog, setDialog] = useState(fromReport.suspendFor ? "suspend" : "");
   const [reason, setReason] = useState(fromReport.reason || "");
   const [duration, setDuration] = useState("");
   const [errors, setErrors] = useState({});
   const [toast, setToast] = useState("");

   if (!user) {
      return (
         <AdminLayout title="Users">
            <Link className="admin-back" to="/admin/users">← Users</Link>
            <p className="admin-banner error">This user was not found.</p>
         </AdminLayout>
      );
   }

   const isAdminTarget = user.role === "admin";
   const isSuspended = user.status === "suspended";

   // ---------- What a suspension would affect (FR-A6 step 4) ----------
   const upcomingTrips = data.trips.filter(t => t.driverId === user.id &&
      (utils.getTripState(t) === "open" || utils.getTripState(t) === "full"));
   const tripBookings = data.bookings.filter(b => upcomingTrips.some(t => t.id === b.tripId) &&
      (b.status === "pending" || b.status === "accepted"));
   const upcomingBookings = data.bookings.filter(b => b.riderId === user.id &&
      (b.status === "pending" || b.status === "accepted") &&
      data.trips.some(t => t.id === b.tripId && (utils.getTripState(t) === "open" || utils.getTripState(t) === "full")));
   // Everyone who gets a notification: the user, riders on their trips, drivers of their bookings
   const notified = new Set([user.id]);
   tripBookings.forEach(b => notified.add(b.riderId));
   upcomingBookings.forEach(b => notified.add(data.trips.find(t => t.id === b.tripId).driverId));

   // ---------- Activity ----------
   const ratingCount = data.ratings.filter(r => r.toId === user.id && !r.deleted).length;
   const lateCancels = data.bookings.filter(b => b.riderId === user.id && b.late).length;
   const reports = data.reports.filter(r => r.subjectId === user.id);
   const held = data.bookings.filter(b => b.riderId === user.id && (b.status === "pending" || b.status === "accepted")).length;
   const balance = utils.getBalance(user.id);

   // Header label: "Suspended until Sun 21 Nov"
   let statusLabel = admin.userStatus(user);
   if (isSuspended && user.suspension && user.suspension.until) {
      statusLabel = "Suspended until " + utils.formatDay(user.suspension.until + "T12:00");
   }

   function openDialog(name) {
      setErrors({});
      // WF-56e: administrator accounts can't be changed here (FR-A6 step 3)
      setDialog(isAdminTarget ? "notAllowed" : name);
   }

   function closeDialog() {
      setDialog("");
      setErrors({});
   }

   function checkReason() {
      if (reason.trim() === "") {
         return "A reason is required.";
      }
      if (reason.length > 500) {
         return "Reason must be 500 characters or fewer.";
      }
      return "";
   }

   // [2] Suspend (FR-A6 steps 2–4)
   function handleSuspend() {
      const newErrors = {};
      const reasonError = checkReason();
      if (reasonError) {
         newErrors.reason = reasonError;
      }
      if (duration === "") {
         newErrors.duration = "Choose a duration.";
      }
      setErrors(newErrors);
      if (newErrors.reason || newErrors.duration) {
         return;
      }
      if (isSuspended) {
         setDialog("alreadySuspended");
         return;
      }

      const chosen = getDurations().find(d => d.value === duration);
      const untilText = chosen.until ? " until " + utils.formatDay(chosen.until + "T12:00") : " until reactivated";

      // Cancel their upcoming trips: riders' bookings are cancelled, which releases their held credits
      upcomingTrips.forEach(t => {
         t.status = "cancelled";
         t.cancelledBy = "admin";
      });
      tripBookings.forEach(b => {
         b.status = "cancelled";
         b.cancelledBy = "admin";
         admin.notify(b.riderId, "changed", "Trip cancelled",
            "Your trip with " + user.name + " was cancelled by UniRide. Your held credit is back in your balance.", "/rider/rides");
      });

      // Cancel their upcoming bookings as a rider and give the seats back to the drivers
      upcomingBookings.forEach(b => {
         const trip = data.trips.find(t => t.id === b.tripId);
         if (b.status === "accepted") {
            trip.seatsLeft = trip.seatsLeft + 1;
            if (trip.status === "full") {
               trip.status = "open";
            }
         }
         b.status = "cancelled";
         b.cancelledBy = "admin";
         admin.notify(trip.driverId, "changed", "Booking cancelled",
            user.name + "'s seat on your trip " + utils.formatDeparture(trip.departure) + " was cancelled by UniRide.", "/driver/trips/" + trip.id);
      });

      // Block sign-in: auth/SignIn.js already refuses accounts with status "suspended"
      user.status = "suspended";
      user.suspension = { reason: reason.trim(), until: chosen.until, adminId: data.session.userId, date: new Date().toISOString() };
      admin.notify(user.id, "report", "Account suspended",
         "Your account is suspended" + untilText + ". Reason: " + reason.trim(), "/account");
      const entry = admin.addAudit("Suspended account" + untilText, user.id, reason.trim());

      let message = user.name + " suspended" + untilText + ". " +
         upcomingTrips.length + (upcomingTrips.length === 1 ? " trip and " : " trips and ") +
         upcomingBookings.length + (upcomingBookings.length === 1 ? " booking" : " bookings") +
         " cancelled; held credits released; " + notified.size + (notified.size === 1 ? " person" : " people") +
         " notified; audit entry " + entry.id + " written.";

      // Came from a report: the report closes now with outcome "Suspend" (FR-A5 step 5)
      const report = data.reports.find(r => r.id === fromReport.suspendFor);
      if (report && report.status !== "closed") {
         report.status = "closed";
         report.outcome = "Suspend";
         report.note = reason.trim();
         report.closedBy = data.session.userId;
         admin.notify(report.reporterId, "report", "Report reviewed",
            "Your report " + report.id + " about " + user.name + " was reviewed by an administrator.", "/account/notifications");
         message = message + " " + report.id + " closed.";
      }

      setDialog("");
      setReason("");
      setDuration("");
      setToast(message);
   }

   // [3] Reactivate (FR-A6 step 5): cancelled trips and bookings are not restored
   function handleReactivate() {
      const reasonError = checkReason();
      setErrors(reasonError ? { reason: reasonError } : {});
      if (reasonError) {
         return;
      }
      if (!isSuspended) {
         setDialog("alreadyActive");
         return;
      }
      user.status = "active";
      user.suspension = null;
      admin.notify(user.id, "accepted", "Account reactivated", "Your UniRide account is active again.", "/account");
      admin.addAudit("Reactivated account", user.id, reason.trim());
      setDialog("");
      setReason("");
      setToast("Account reactivated. " + user.name + " was notified; audit entry written.");
   }

   const cancelledTrips = data.trips.filter(t => t.driverId === user.id && t.status === "cancelled" && t.cancelledBy === "admin").length;
   const cancelledBookings = data.bookings.filter(b => b.riderId === user.id && b.status === "cancelled" && b.cancelledBy === "admin").length;

   return (
      <AdminLayout title="Users">
         <Toast text={toast} />
         <Link className="admin-back" to="/admin/users">← Users</Link>
         <h2 className="admin-title">{user.name} <Pill tone={admin.statusTone(user)}>{statusLabel}</Pill></h2>
         <p className="user-sub">{user.email} · {admin.capabilityText(user)} · Joined {admin.joinedText(user)}</p>

         {isSuspended && user.suspension && (
            <p className="admin-banner error">Suspended by {utils.getUserName(user.suspension.adminId)} · Reason: {user.suspension.reason}</p>
         )}

         <div className="user-grid">
            <div className="user-column">
               <section className="admin-panel">
                  <h2>Activity</h2>
                  <div className="admin-row"><span>Rating</span><span>{ratingCount > 0 ? utils.getRatingValue(user.id) + " (" + ratingCount + " ratings)" : "No ratings yet"}</span></div>
                  <div className="admin-row"><span>Completed trips</span><span>{utils.getCompletedCount(user.id)}</span></div>
                  <div className="admin-row"><span>Upcoming trips</span>
                     <span>{upcomingTrips.length} ({tripBookings.filter(b => b.status === "accepted").length} riders booked){cancelledTrips > 0 ? " · " + cancelledTrips + " cancelled by UniRide" : ""}</span></div>
                  <div className="admin-row"><span>Upcoming bookings</span>
                     <span>{upcomingBookings.length}{cancelledBookings > 0 ? " · " + cancelledBookings + " cancelled by UniRide" : ""}</span></div>
                  <div className="admin-row"><span>Late cancellations</span><span>{lateCancels}</span></div>
                  <div className="admin-row"><span>Vehicle</span>
                     <span>{user.vehicle ? user.vehicle.colour + " " + user.vehicle.make + " " + user.vehicle.model + " · plate " + admin.formatPlate(user.vehicle.plate) + " (" + user.vehicleStatus + ")" : "None"}</span></div>
               </section>

               <section className="admin-panel">
                  <h2>Reports about this user</h2>
                  {reports.length === 0 && <p className="admin-muted">No reports.</p>}
                  {reports.map(r => (
                     <div key={r.id} className="user-report">
                        <Link to={"/admin/reports/" + r.id}>{r.id} · {r.category}</Link>
                        <Pill tone={reportTones[r.status]}>{r.outcome || r.status}</Pill>
                     </div>
                  ))}
               </section>
            </div>

            <div className="user-column">
               <section className="admin-panel">
                  <h2>Credits</h2>
                  <div className="admin-row"><span>Balance</span><span>{balance}</span></div>
                  <div className="admin-row"><span>Held</span><span>{held}</span></div>
                  <div className="admin-row"><span>Available</span><span>{balance - held}</span></div>
                  <Link className="user-link" to={"/admin/ratings?user=" + user.id}>Full credit history</Link>
                  {!isAdminTarget && (
                     <Link className="admin-button secondary user-adjust" to={"/admin/ratings?user=" + user.id + "&adjust=1"}>Adjust balance…</Link>
                  )}
               </section>

               <section className="admin-panel user-actions">
                  <h2>Account actions</h2>
                  {isSuspended
                     ? <button type="button" className="admin-button secondary" onClick={() => openDialog("reactivate")}>Reactivate account…</button>
                     : <button type="button" className="admin-button danger" onClick={() => openDialog("suspend")}>Suspend account…</button>}
                  <p className="admin-hint">Every suspension and reactivation is written to the audit log.</p>
               </section>
               <p className="admin-hint">Restricted data (email, plate, full credit history) is visible to administrators only.</p>
            </div>
         </div>

         {/* WF-56b: suspend dialog */}
         {dialog === "suspend" && (
            <Modal title={"Suspend " + user.name + "?"} onClose={closeDialog}>
               {fromReport.suspendFor && <p className="admin-hint">Outcome of report {fromReport.suspendFor}. The report closes when you confirm.</p>}
               <label htmlFor="reason">Reason *</label>
               <textarea id="reason" rows="3" value={reason} onChange={e => setReason(e.target.value)} className={errors.reason ? "invalid" : ""}></textarea>
               {errors.reason
                  ? <p className="admin-error">⚠ {errors.reason}</p>
                  : <p className="admin-hint">Shown to the user · up to 500 characters · {reason.length}/500</p>}

               <label>Duration *</label>
               {getDurations().map(d => (
                  <label key={d.value} className="user-option">
                     <input type="radio" name="duration" value={d.value} checked={duration === d.value} onChange={e => setDuration(e.target.value)} />
                     {d.label}
                  </label>
               ))}
               {errors.duration && <p className="admin-error">⚠ {errors.duration}</p>}

               <div className="user-warning">
                  <strong>⚠ Impact</strong>
                  Sign-in will be blocked. {upcomingTrips.length} upcoming {upcomingTrips.length === 1 ? "trip" : "trips"} ({tripBookings.length} riders booked or waiting) and {upcomingBookings.length} upcoming {upcomingBookings.length === 1 ? "booking" : "bookings"} will be cancelled. Affected riders' held credits will be released and all {notified.size} {notified.size === 1 ? "person" : "people"} notified.
               </div>

               <div className="admin-modal-actions">
                  <button type="button" className="admin-button secondary" onClick={closeDialog}>Cancel</button>
                  <button type="button" className="admin-button danger" onClick={handleSuspend}>Suspend account</button>
               </div>
            </Modal>
         )}

         {/* WF-56d: reactivate dialog */}
         {dialog === "reactivate" && (
            <Modal title={"Reactivate " + user.name + "?"} onClose={closeDialog}>
               <label htmlFor="reason">Reason *</label>
               <textarea id="reason" rows="3" value={reason} onChange={e => setReason(e.target.value)} className={errors.reason ? "invalid" : ""}></textarea>
               {errors.reason
                  ? <p className="admin-error">⚠ {errors.reason}</p>
                  : <p className="admin-hint">Required · up to 500 characters · {reason.length}/500</p>}
               <p className="admin-hint">Access is restored immediately and the user is notified. Cancelled trips and bookings are not restored.</p>
               <div className="admin-modal-actions">
                  <button type="button" className="admin-button secondary" onClick={closeDialog}>Cancel</button>
                  <button type="button" className="admin-button primary" onClick={handleReactivate}>Reactivate account</button>
               </div>
            </Modal>
         )}

         {/* WF-56e: action not allowed */}
         {(dialog === "notAllowed" || dialog === "alreadySuspended" || dialog === "alreadyActive") && (
            <Modal title="Can't change this account" onClose={closeDialog}>
               <div className="admin-banner error">
                  <strong>⚠ Action not allowed</strong><br />
                  {dialog === "notAllowed" && "Administrator accounts can't be suspended or reactivated from this console."}
                  {dialog === "alreadySuspended" && "This account is already suspended."}
                  {dialog === "alreadyActive" && "This account is already active."}
               </div>
               <div className="admin-modal-actions user-close">
                  <button type="button" className="admin-button primary" onClick={closeDialog}>Close</button>
               </div>
            </Modal>
         )}
      </AdminLayout>
   );
}

export default UserDetails;
