import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import utils from "../driver/driverUtils";
import AdminLayout from "./AdminLayout";
import admin from "./adminData";
import { Pill } from "./AdminUI";
import "./Admin.css";
import "./Users.css";

// WF-56 Users: search by name or email, filter by status and capability (FR-A6 step 1)
function Users() {
   const [search, setSearch] = useState("");
   const [status, setStatus] = useState("all");
   const [capability, setCapability] = useState("all");

   const text = search.trim().toLowerCase();
   const list = data.users.filter(u =>
      (text === "" || u.name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text)) &&
      (status === "all" || admin.userStatus(u) === status) &&
      (capability === "all" || admin.capabilityText(u) === capability));

   return (
      <AdminLayout title="Users">
         {/* The list updates while you type, so there is no Search button */}
         <div className="users-filters">
            <div className="users-field grow">
               <label htmlFor="search">Search users</label>
               <input type="text" id="search" placeholder="Name or university email" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="users-field">
               <label htmlFor="status">Status</label>
               <select id="status" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="all">All</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Unverified">Unverified</option>
               </select>
            </div>
            <div className="users-field">
               <label htmlFor="capability">Capability</label>
               <select id="capability" value={capability} onChange={e => setCapability(e.target.value)}>
                  <option value="all">All</option>
                  <option value="Rider">Rider</option>
                  <option value="Rider · Driver">Rider · Driver</option>
                  <option value="Administrator">Administrator</option>
               </select>
            </div>
         </div>

         {list.length === 0 && <p className="admin-muted">No users match.</p>}

         {list.length > 0 && (
            <div className="admin-table-wrap">
               <table className="admin-table">
                  <thead>
                     <tr><th>Name</th><th>University email</th><th>Capabilities</th><th>Status</th><th>Rating</th><th>Joined</th><th></th></tr>
                  </thead>
                  <tbody>
                     {list.map(u => (
                        <tr key={u.id}>
                           <td>{u.name}</td>
                           <td>{u.email}</td>
                           <td>{admin.capabilityText(u)}</td>
                           <td><Pill tone={admin.statusTone(u)}>{admin.userStatus(u)}</Pill></td>
                           <td>{utils.getRatingValue(u.id) || "—"}</td>
                           <td>{admin.joinedText(u)}</td>
                           <td><Link to={"/admin/users/" + u.id}>Open</Link></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </AdminLayout>
   );
}

export default Users;
