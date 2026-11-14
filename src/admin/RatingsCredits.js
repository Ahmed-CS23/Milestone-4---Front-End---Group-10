import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import AdminCreditHistory from "./AdminCreditHistory";
import { applyAdjustment, creditSummary } from "./AdjustBalance";
import { Toast, Modal } from "./AdminUI";
import "./Admin.css";
import "./RatingsCredits.css";

function RatingsCredits() {
   const [searchParams] = useSearchParams();
   const userId = searchParams.get("user");

   const [tab, setTab] = useState("ratings");
   const [deleting, setDeleting] = useState(null);   // the rating in the delete dialog
   const [rejecting, setRejecting] = useState(null); // the approval in the reject dialog
   const [text, setText] = useState("");            // justification or rejection reason
   const [error, setError] = useState("");
   const [rowError, setRowError] = useState("");
   const [toast, setToast] = useState("");

   if (userId) {
      return (
         <AdminLayout title="Ratings & credits">
            <AdminCreditHistory userId={userId} openAdjust={searchParams.get("adjust") === "1"} />
         </AdminLayout>
      );
   }

   const me = data.session.userId;
   const flagged = data.ratings.filter(r => r.flagged && !r.deleted);
   const approvals = data.creditApprovals.filter(a => a.status === "pending");

   function closeDialogs() {
      setDeleting(null);
      setRejecting(null);
      setText("");
      setError("");
   }

   function checkText(emptyMessage) {
      if (text.trim() === "") {
         return emptyMessage;
      }
      if (text.length > 500) {
         return "Must be 500 characters or fewer.";
      }
      return "";
   }

   // ---------- WF-57a: delete a rating (FR-A7 steps 3, 4 and 6) ----------
   function handleDelete() {
      const problem = checkText("A justification is required.");
      setError(problem);
      if (problem) {
         return;
      }
      if (deleting.deleted) {
         closeDialogs();
         setToast("This rating was already removed.");
         return;
      }
      // The team's rating averages skip deleted ratings, so the average is recalculated by itself
      deleting.deleted = true;
      deleting.deletedBy = me;
      deleting.deleteReason = text.trim();
      const author = utils.getUserName(deleting.fromId);
      const subject = utils.getUserName(deleting.toId);
      admin.notify(deleting.fromId, "rating", "Rating removed",
         "Your " + deleting.stars + "-star rating of " + subject + " was removed by an administrator. Reason: " + text.trim(), "/account/notifications");
      const entry = admin.addAudit("Deleted rating", deleting.id, text.trim());
      closeDialogs();
      setToast("Rating deleted. " + subject + "'s average recalculated; " + author + " notified; audit entry " + entry.id + " written.");
   }

   // ---------- WF-58c / WF-58e: second approval ----------
   function handleApprove(approval) {
      setRowError("");
      // The balance may have changed since the request
      const available = creditSummary(approval.userId).available;
      if (available + approval.amount < 0) {
         setRowError("This adjustment would now take available credits below 0 (available: " + available + "). Reject it or ask the requester to resubmit.");
         return;
      }
      applyAdjustment(approval.userId, approval.amount, approval.justification, approval.requestedBy, me);
      approval.status = "approved";
      approval.approvedBy = me;
      const user = utils.getUserName(approval.userId);
      const requester = utils.getUserName(approval.requestedBy);
      admin.notify(approval.requestedBy, "accepted", "Adjustment approved",
         "Your " + (approval.amount > 0 ? "+" : "") + approval.amount + " adjustment for " + user + " was approved.", "/admin/ratings");
      admin.addAudit("Approved credit adjustment", approval.userId, approval.justification);
      setToast((approval.amount > 0 ? "+" : "") + approval.amount + " credits applied to " + user + "; " + requester + " and " + user +
         " were notified; credit-history and audit entries written.");
   }

   function handleReject() {
      const problem = checkText("A reason is required to reject.");
      setError(problem);
      if (problem) {
         return;
      }
      rejecting.status = "rejected";
      rejecting.rejectedBy = me;
      rejecting.rejectReason = text.trim();
      admin.notify(rejecting.requestedBy, "info", "Adjustment rejected",
         "Your adjustment for " + utils.getUserName(rejecting.userId) + " was rejected: " + text.trim(), "/admin/ratings");
      admin.addAudit("Rejected credit adjustment", rejecting.userId, text.trim());
      closeDialogs();
      setToast("Adjustment rejected. Nothing was applied; " + utils.getUserName(rejecting.requestedBy) + " was notified.");
   }

   return (
      <AdminLayout title="Ratings & credits">
         <Toast text={toast} />

         <div className="admin-tabs">
            <button type="button" className={tab === "ratings" ? "active" : ""} onClick={() => setTab("ratings")}>Flagged ratings ({flagged.length})</button>
            <button type="button" className={tab === "approvals" ? "active" : ""} onClick={() => setTab("approvals")}>Credit approvals ({approvals.length})</button>
         </div>

         {/* WF-57: flagged ratings */}
         {tab === "ratings" && (
            <>
               {flagged.length === 0 && <p className="admin-muted">No flagged ratings.</p>}
               {flagged.length > 0 && (
                  <div className="admin-table-wrap">
                     <table className="admin-table">
                        <thead><tr><th>Rating</th><th>Author</th><th>Subject</th><th>Trip</th><th>Review (admin view)</th><th>Flagged by</th><th></th></tr></thead>
                        <tbody>
                           {flagged.map(r => (
                              <tr key={r.id}>
                                 <td>{r.stars} / 5</td>
                                 <td>{utils.getUserName(r.fromId)}</td>
                                 <td>{utils.getUserName(r.toId)}</td>
                                 <td>{r.tripId.toUpperCase()}</td>
                                 <td className="credit-detail">“{r.review}”</td>
                                 <td>{r.flaggedBy ? <Link to={"/admin/reports/" + r.flaggedBy}>Report {r.flaggedBy}</Link> : "—"}</td>
                                 <td><button type="button" className="credit-link" onClick={() => setDeleting(r)}>Delete…</button></td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </>
         )}

         {/* WF-58c: credit approvals */}
         {tab === "approvals" && (
            <>
               <p className="admin-muted">Adjustments above the threshold wait here until a different administrator approves or rejects them.</p>
               {rowError && <p className="admin-banner error" role="alert">{rowError}</p>}
               {approvals.length === 0 && <p className="admin-muted">Nothing waiting for approval.</p>}
               {approvals.length > 0 && (
                  <div className="admin-table-wrap">
                     <table className="admin-table">
                        <thead><tr><th>Requested by</th><th>User</th><th>Change</th><th>Justification</th><th>Requested</th><th></th></tr></thead>
                        <tbody>
                           {approvals.map(a => (
                              <tr key={a.id}>
                                 <td>{utils.getUserName(a.requestedBy)}{a.requestedBy === me ? " (you)" : ""}</td>
                                 <td><Link to={"/admin/ratings?user=" + a.userId}>{utils.getUserName(a.userId)}</Link></td>
                                 <td>{a.amount > 0 ? "+" + a.amount : a.amount}</td>
                                 <td className="credit-detail">{a.justification}</td>
                                 <td>{formatDate(a.date)}</td>
                                 <td>
                                    {/* The requester can't approve their own adjustment (FR-A7 step 3) */}
                                    {a.requestedBy === me
                                       ? <span className="admin-hint">You can't approve your own request</span>
                                       : <div className="credit-actions">
                                          <button type="button" className="admin-button secondary" onClick={() => { setText(""); setError(""); setRejecting(a); }}>Reject</button>
                                          <button type="button" className="admin-button primary" onClick={() => handleApprove(a)}>Approve</button>
                                       </div>}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </>
         )}

         {/* WF-57a: delete dialog */}
         {deleting && (
            <Modal title="Delete this rating?" onClose={closeDialogs}>
               <div className="credit-quote">
                  <strong>{deleting.stars} / 5 by {utils.getUserName(deleting.fromId)} for {utils.getUserName(deleting.toId)} · {formatDate(deleting.date)}</strong>
                  <span>“{deleting.review}”</span>
               </div>
               <label htmlFor="justification">Justification *</label>
               <textarea id="justification" rows="3" value={text} onChange={e => setText(e.target.value)} className={error ? "invalid" : ""}></textarea>
               {error ? <p className="admin-error">⚠ {error}</p> : <p className="admin-hint">Required · up to 500 characters · {text.length}/500</p>}
               <p className="admin-hint">The rating is removed, {utils.getUserName(deleting.toId)}'s average recalculated and {utils.getUserName(deleting.fromId)} notified. An audit entry is written.</p>
               <div className="admin-modal-actions">
                  <button type="button" className="admin-button secondary" onClick={closeDialogs}>Cancel</button>
                  <button type="button" className="admin-button danger" onClick={handleDelete}>Delete rating</button>
               </div>
            </Modal>
         )}

         {/* Reject an adjustment */}
         {rejecting && (
            <Modal title={"Reject " + (rejecting.amount > 0 ? "+" : "") + rejecting.amount + " for " + utils.getUserName(rejecting.userId) + "?"} onClose={closeDialogs}>
               <label htmlFor="rejectReason">Reason *</label>
               <textarea id="rejectReason" rows="3" value={text} onChange={e => setText(e.target.value)} className={error ? "invalid" : ""}></textarea>
               {error ? <p className="admin-error">⚠ {error}</p> : <p className="admin-hint">Sent to {utils.getUserName(rejecting.requestedBy)} · up to 500 characters</p>}
               <p className="admin-hint">Nothing is applied. The requester is notified and an audit entry is written.</p>
               <div className="admin-modal-actions">
                  <button type="button" className="admin-button secondary" onClick={closeDialogs}>Cancel</button>
                  <button type="button" className="admin-button danger" onClick={handleReject}>Reject adjustment</button>
               </div>
            </Modal>
         )}
      </AdminLayout>
   );
}

export default RatingsCredits;
