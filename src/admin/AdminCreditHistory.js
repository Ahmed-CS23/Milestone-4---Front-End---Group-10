import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import utils from "../driver/driverUtils";
import AdjustBalance, { creditSummary } from "./AdjustBalance";
import { Toast, Pill } from "./AdminUI";

const typeLabels = { starting: "Starting credits", earned: "Earned", spent: "Spent", held: "Held", released: "Released", admin: "Admin correction" };
const typeTones = { starting: "grey", earned: "green", spent: "grey", held: "amber", released: "grey", admin: "blue" };

// Credit history (admin view) and WF-58d "adjustment applied" (FR-A7 steps 5–6)
function AdminCreditHistory(props) {
   const user = data.users.find(u => u.id === props.userId);
   const [showAdjust, setShowAdjust] = useState(props.openAdjust && user && user.role !== "admin");
   const [toast, setToast] = useState("");

   if (!user) {
      return (
         <>
            <Link className="admin-back" to="/admin/users">← Users</Link>
            <p className="admin-banner error">This user was not found.</p>
         </>
      );
   }

   const summary = creditSummary(user.id);
   // Newest first
   const entries = data.credits.filter(c => c.userId === user.id).sort((a, b) => b.date.localeCompare(a.date));

   function handleDone(message) {
      setShowAdjust(false);
      setToast(message);
   }

   return (
      <>
         <Toast text={toast} />
         <Link className="admin-back" to={"/admin/users/" + user.id}>← {user.name}</Link>
         <div className="credit-head">
            <h2 className="admin-title">{user.name} · credit history (admin view)</h2>
            <span>Balance {summary.balance} · held {summary.held} · available {summary.available}</span>
         </div>

         {entries.length === 0 && <p className="admin-muted">No credit entries yet.</p>}
         {entries.length > 0 && (
            <div className="admin-table-wrap">
               <table className="admin-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Amount</th></tr></thead>
                  <tbody>
                     {entries.map(c => (
                        <tr key={c.id}>
                           <td>{formatDate(c.date)}</td>
                           <td><Pill tone={typeTones[c.type]}>{typeLabels[c.type] || c.type}</Pill></td>
                           <td className="credit-detail">
                              {c.type === "admin"
                                 ? "“" + c.label + "” — " + utils.getUserName(c.adminId) + (c.approvedBy ? ", approved by " + utils.getUserName(c.approvedBy) : "")
                                 : c.label}
                           </td>
                           <td>{c.amount > 0 ? "+" + c.amount : "−" + Math.abs(c.amount)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}

         {user.role !== "admin" && (
            <button type="button" className="admin-button secondary credit-adjust" onClick={() => setShowAdjust(true)}>Adjust balance…</button>
         )}

         {showAdjust && <AdjustBalance user={user} onClose={() => setShowAdjust(false)} onDone={handleDone} />}
      </>
   );
}

export default AdminCreditHistory;
