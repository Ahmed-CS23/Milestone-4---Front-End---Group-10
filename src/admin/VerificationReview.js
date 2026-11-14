import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Pill, Modal } from "./AdminUI";
import "./Admin.css";
import "./VerificationReview.css";

// Rejection reasons (assumption A-28)
const reasons = [
   "Plate does not match the vehicle",
   "Vehicle details incomplete",
   "Capacity not plausible",
   "Other"
];

// WF-52a review, WF-52b reject dialog, WF-52d approval blocked (FR-A2)
function VerificationReview() {
   const navigate = useNavigate();
   const { userId } = useParams();
   const user = data.users.find(u => u.id === userId && u.role === "user");

   const [showReject, setShowReject] = useState(false);
   const [reason, setReason] = useState("");
   const [note, setNote] = useState("");
   const [errors, setErrors] = useState({});
   const [message, setMessage] = useState("");

   // Wrong link: no such user or no vehicle
   if (!user || !user.vehicle) {
      return (
         <AdminLayout title="Verifications">
            <Link className="admin-back" to="/admin/verifications">← Verifications</Link>
            <p className="admin-banner error">This submission was not found.</p>
         </AdminLayout>
      );
   }

   // Plate check: does a verified account already use this plate? (FR-A2 step 3)
   const plateOwner = data.users.find(u => u.id !== user.id && u.vehicleStatus === "approved" &&
      u.vehicle && u.vehicle.plate === user.vehicle.plate);
   const isPending = user.vehicleStatus === "pending";
   const plate = admin.formatPlate(user.vehicle.plate);

   // Info for the Applicant panel
   const starting = data.credits.find(c => c.userId === user.id && c.type === "starting");
   const rejections = user.vehicleRejections || 0;

   // [2] Approve: still pending + plate free → approved, notified, audit (FR-A2 step 4)
   function handleApprove() {
      if (user.vehicleStatus !== "pending") {
         setMessage("This submission is no longer pending.");
         return;
      }
      if (plateOwner) {
         return;
      }
      user.vehicleStatus = "approved";
      // Starting credits are NOT given again (A-03): they were given when the email was verified.
      admin.notify(user.id, "accepted", "Vehicle approved",
         "Your " + user.vehicle.make + " " + user.vehicle.model + " was approved. You can now post trips.", "/driver");
      admin.addAudit("Approved vehicle", user.id, "Plate " + plate);
      navigate("/admin/verifications", { state: { toast: "Approved. " + user.name + " can now post trips and has been notified.", tab: "pending" } });
   }

   // [3] Reject: reason required, note ≤ 500 (FR-A2 steps 3 and 5)
   function handleReject() {
      const newErrors = {};
      if (reason === "") {
         newErrors.reason = "A reason is required to reject.";
      }
      if (note.length > 500) {
         newErrors.note = "Note must be 500 characters or fewer.";
      }
      setErrors(newErrors);
      if (newErrors.reason || newErrors.note) {
         return;
      }
      if (user.vehicleStatus !== "pending") {
         setShowReject(false);
         setMessage("This submission is no longer pending.");
         return;
      }

      user.vehicleStatus = "rejected";
      // auth/Account.js shows rejectReason to the user with "Update and resubmit"
      user.rejectReason = reason + (note.trim() ? " — " + note.trim() : "");
      user.vehicleRejections = rejections + 1;
      admin.notify(user.id, "info", "Vehicle not approved",
         "Reason: " + user.rejectReason + ". Open Account, update your vehicle details and resubmit.", "/account");
      admin.addAudit("Rejected vehicle", user.id, user.rejectReason);
      navigate("/admin/verifications", { state: { toast: "Rejected. " + user.name + " was notified with the steps to resubmit.", tab: "pending" } });
   }

   function closeReject() {
      setShowReject(false);
      setErrors({});
   }

   let statusPill = <Pill tone="blue">Pending review</Pill>;
   if (user.vehicleStatus === "approved") {
      statusPill = <Pill tone="green">Approved</Pill>;
   }
   else if (user.vehicleStatus === "rejected") {
      statusPill = <Pill tone="red">Rejected</Pill>;
   }

   return (
      <AdminLayout title="Verifications">
         <Link className="admin-back" to="/admin/verifications">← Verifications</Link>
         <h2 className="admin-title">{user.name} {statusPill}</h2>

         {message && <p className="admin-banner error" role="alert">{message}</p>}

         {/* WF-52d: plate already on a verified account */}
         {isPending && plateOwner && (
            <div className="admin-banner error" role="alert">
               <strong>Can't approve</strong><br />
               Plate {plate} now belongs to a verified account ({plateOwner.name}). Reject this submission or ask the user to correct the plate.
            </div>
         )}

         <div className="review-grid">
            <div className="review-left">
               <section className="admin-panel">
                  <h2>Applicant</h2>
                  <div className="admin-row"><span>University email</span><span>{user.email}{user.verified ? " · verified" : " · not verified"}</span></div>
                  <div className="admin-row"><span>Email verified on</span><span>{starting ? formatDate(starting.date) : "—"}</span></div>
                  <div className="admin-row"><span>Account</span><span>{starting ? "Verified rider · " + starting.amount + " starting credits granted" : "Rider"}</span></div>
                  <div className="admin-row"><span>Previous submissions</span><span>{rejections > 0 ? rejections + " rejected" : "None"}</span></div>
                  <div className="admin-row"><span>Submitted</span><span>{formatDate(user.vehicleSubmittedAt) || "—"}</span></div>
               </section>

               <section className="admin-panel">
                  <h2>Vehicle</h2>
                  <div className="admin-row"><span>Make / model</span><span>{user.vehicle.make} {user.vehicle.model}</span></div>
                  <div className="admin-row"><span>Colour</span><span>{user.vehicle.colour}</span></div>
                  <div className="admin-row"><span>Plate number</span><span>{plate}</span></div>
                  <div className="admin-row"><span>Passenger capacity</span><span>{user.vehicle.capacity}</span></div>
               </section>
            </div>

            <section className="admin-panel review-decision">
               <h2>Decision</h2>

               {!isPending && (
                  <p className="admin-muted">
                     This submission is no longer pending.
                     {user.vehicleStatus === "rejected" && " Reason: " + user.rejectReason}
                  </p>
               )}

               {isPending && (
                  <>
                     {plateOwner
                        ? <p className="admin-banner error">⚠ Plate check failed: plate registered to a verified account.</p>
                        : <p className="admin-banner success">✓ Plate check passed<br />No verified account uses plate {plate}.</p>}

                     <button type="button" className="admin-button primary" onClick={handleApprove} disabled={!!plateOwner}>Approve vehicle</button>
                     <button type="button" className="admin-button danger" onClick={() => setShowReject(true)}>Reject…</button>
                     <p className="admin-hint">Approval unlocks driver tools and notifies the user. Starting credits are not granted again.</p>
                  </>
               )}
            </section>
         </div>

         {/* WF-52b: reject dialog */}
         {showReject && (
            <Modal title={"Reject " + user.name + "'s vehicle?"} onClose={closeReject}>
               <label htmlFor="reason">Reason *</label>
               <select id="reason" value={reason} onChange={e => setReason(e.target.value)}
                  className={errors.reason ? "invalid" : ""}>
                  <option value="">Select a reason</option>
                  {reasons.map(r => <option key={r} value={r}>{r}</option>)}
               </select>
               {errors.reason && <p className="admin-error">⚠ {errors.reason}</p>}

               <label htmlFor="note">Note to the user (optional)</label>
               <textarea id="note" rows="3" value={note} onChange={e => setNote(e.target.value)}
                  className={errors.note ? "invalid" : ""}></textarea>
               {errors.note
                  ? <p className="admin-error">⚠ {errors.note}</p>
                  : <p className="admin-hint">Shown with the resubmission steps · {note.length}/500 characters</p>}

               <p className="admin-hint">The user will be notified with the steps to resubmit. Their vehicle stays unverified; rider access is not affected.</p>

               <div className="admin-modal-actions">
                  <button type="button" className="admin-button secondary" onClick={closeReject}>Cancel</button>
                  <button type="button" className="admin-button danger" onClick={handleReject}>Reject vehicle</button>
               </div>
            </Modal>
         )}
      </AdminLayout>
   );
}

export default VerificationReview;
