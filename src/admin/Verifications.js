import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import data from "../shared/data";
import formatDate from "../auth/dates";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Toast } from "./AdminUI";
import "./Admin.css";

// WF-52 Verification queue, WF-52c (toast after approving or rejecting)
function Verifications() {
   const location = useLocation();
   // The review page sends us back here with a message and the tab to open
   const fromReview = location.state || {};

   const [tab, setTab] = useState(fromReview.tab || "pending");

   // Every user who submitted a vehicle, oldest first
   const submitted = data.users
       .filter(u => u.vehicle && u.role === "user")
       .sort((a, b) => (a.vehicleSubmittedAt || "").localeCompare(b.vehicleSubmittedAt || ""));

   const pending = submitted.filter(u => u.vehicleStatus === "pending");
   const rejected = submitted.filter(u => u.vehicleStatus === "rejected");
   const approved = submitted.filter(u => u.vehicleStatus === "approved");

   let list = pending;
   let intro = "Vehicles awaiting manual review, oldest first. These accounts have already verified their university email.";
   if (tab === "rejected") {
      list = rejected;
      intro = "Vehicles that were not approved. The user can correct the details and resubmit.";
   }
   else if (tab === "approved") {
      list = approved;
      intro = "Approved vehicles. These users can post trips.";
   }

   return (
       <AdminLayout title="Verifications">
          <Toast text={fromReview.toast} />

          <div className="admin-tabs">
             <button type="button" className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>Pending ({pending.length})</button>
             <button type="button" className={tab === "rejected" ? "active" : ""} onClick={() => setTab("rejected")}>Rejected ({rejected.length})</button>
             <button type="button" className={tab === "approved" ? "active" : ""} onClick={() => setTab("approved")}>Approved</button>
          </div>

          <p className="admin-muted">{intro}</p>

          {list.length === 0 && <p className="admin-muted">Nothing here right now.</p>}

          {list.length > 0 && (
              <div className="admin-table-wrap">
                 <table className="admin-table">
                    <thead>
                    <tr>
                       <th>Name</th>
                       <th>University email</th>
                       <th>Vehicle</th>
                       <th>Plate</th>
                       <th>Seats</th>
                       <th>{tab === "rejected" ? "Reason" : "Submitted"}</th>
                       <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {list.map(u => (
                        <tr key={u.id}>
                           <td>{u.name}</td>
                           <td>{u.email}</td>
                           <td>{u.vehicle.colour} {u.vehicle.make} {u.vehicle.model}</td>
                           <td>{admin.formatPlate(u.vehicle.plate)}</td>
                           <td>{u.vehicle.capacity}</td>
                           <td>{tab === "rejected" ? u.rejectReason : formatDate(u.vehicleSubmittedAt) || "—"}</td>
                           <td><Link to={"/admin/verifications/" + u.id}>{tab === "pending" ? "Review" : "View"}</Link></td>
                        </tr>
                    ))}
                    </tbody>
                 </table>
              </div>
          )}
       </AdminLayout>
   );
}

export default Verifications;