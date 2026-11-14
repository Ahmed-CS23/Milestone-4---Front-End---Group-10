import { useState } from "react";
import data from "../shared/data";
import utils from "../driver/driverUtils";
import admin from "./adminData";
import { Modal } from "./AdminUI";

// Adjustments bigger than this need a second administrator (assumption A-17)
const THRESHOLD = 5;

// Balance, held and available credits for one user (same rules as driverUtils)
function creditSummary(userId) {
   const balance = utils.getBalance(userId);
   const available = utils.getAvailableCredits(userId);
   return { balance: balance, held: balance - available, available: available };
}

// Writes the "Admin correction" entry the user sees in their credit history (FR-A7 step 5)
function applyAdjustment(userId, amount, justification, requestedBy, approvedBy) {
   data.credits.push({
      id: "c" + Date.now(),
      userId: userId,
      type: "admin",
      amount: amount,
      label: justification,
      adminId: requestedBy,
      approvedBy: approvedBy || "",
      date: new Date().toISOString().substring(0, 10)
   });
   admin.notify(userId, "info", "Credit balance corrected",
      (amount > 0 ? "+" : "") + amount + " credit(s) by an administrator: " + justification, "/rider/credits");
}

// WF-58 dialog, WF-58a validation, WF-58b above the threshold (FR-A7 steps 2–3)
function AdjustBalance(props) {
   const user = props.user;
   const summary = creditSummary(user.id);

   const [amount, setAmount] = useState("");
   const [justification, setJustification] = useState("");
   const [errors, setErrors] = useState({});

   // "+8" → 8, "-4" → -4, anything else → NaN
   const number = /^[+-]?\d+$/.test(amount.trim()) ? Number(amount.trim()) : NaN;
   const needsApproval = Math.abs(number) > THRESHOLD;

   function handleSubmit() {
      const newErrors = {};
      if (isNaN(number) || number === 0) {
         newErrors.amount = "Enter a whole number other than 0.";
      }
      else if (summary.available + number < 0) {
         newErrors.amount = "This would take available credits below 0 (available: " + summary.available + ").";
      }
      if (justification.trim() === "") {
         newErrors.justification = "A justification is required.";
      }
      else if (justification.length > 500) {
         newErrors.justification = "Justification must be 500 characters or fewer.";
      }
      setErrors(newErrors);
      if (newErrors.amount || newErrors.justification) {
         return;
      }

      const sign = number > 0 ? "+" : "";
      // WF-58b: above the threshold it waits in Credit approvals
      if (needsApproval) {
         data.creditApprovals.push({
            id: "ca" + Date.now(),
            userId: user.id,
            amount: number,
            justification: justification.trim(),
            requestedBy: data.session.userId,
            status: "pending",
            date: new Date().toISOString()
         });
         admin.addAudit("Requested credit adjustment " + sign + number, user.id, justification.trim());
         props.onDone("Submitted for approval. Another administrator must approve " + sign + number + " for " + user.name + " before it is applied.");
         return;
      }

      // WF-58d: within the threshold it is applied now
      applyAdjustment(user.id, number, justification.trim(), data.session.userId, "");
      admin.addAudit("Adjusted credits " + sign + number, user.id, justification.trim());
      props.onDone(sign + number + (Math.abs(number) === 1 ? " credit" : " credits") + " applied to " + user.name +
         "; credit-history entry “Admin correction” created with your name and justification.");
   }

   return (
      <Modal title={"Adjust " + user.name + "'s balance"} onClose={props.onClose}>
         <div className="credit-tiles">
            <div><span>Balance</span><strong>{summary.balance}</strong></div>
            <div><span>Held</span><strong>{summary.held}</strong></div>
            <div><span>Available</span><strong>{summary.available}</strong></div>
         </div>

         <label htmlFor="amount">Adjustment (credits) *</label>
         <input type="text" id="amount" className={"credit-input" + (errors.amount ? " invalid" : "")}
            placeholder="+1 or -1" value={amount} onChange={e => { setAmount(e.target.value); setErrors({...errors, amount: ""}); }} />
         {errors.amount
            ? <p className="admin-error">⚠ {errors.amount}</p>
            : <p className="admin-hint">Whole number, not zero. Use − to remove credits; available credits can't go below 0.</p>}

         <label htmlFor="justification">Justification * (visible to the user)</label>
         <textarea id="justification" rows="3" value={justification} onChange={e => { setJustification(e.target.value); setErrors({...errors, justification: ""}); }}
            className={errors.justification ? "invalid" : ""}></textarea>
         {errors.justification
            ? <p className="admin-error">⚠ {errors.justification}</p>
            : <p className="admin-hint">Required · up to 500 characters · {justification.length}/500</p>}

         {needsApproval
            ? <p className="admin-banner info">ⓘ <strong>Second approval needed</strong><br />{amount.trim()} is above the {THRESHOLD}-credit threshold, so it will wait for a second administrator's approval before it is applied.</p>
            : <p className="admin-hint">Adjustments of more than {THRESHOLD} credits need a second administrator's approval.</p>}

         <div className="admin-modal-actions">
            <button type="button" className="admin-button secondary" onClick={props.onClose}>Cancel</button>
            <button type="button" className="admin-button primary" onClick={handleSubmit}>
               {needsApproval ? "Submit for approval" : "Apply adjustment"}
            </button>
         </div>
      </Modal>
   );
}

export { creditSummary, applyAdjustment };
export default AdjustBalance;
