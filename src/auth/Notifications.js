import { useState } from "react";
import { Link } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import formatDate from "./dates";
import "./SignIn.css";
import "./SignUp.css";
import "./Account.css";
import "./Notifications.css";

const icons = {
   accepted: "✓",
   changed: "✎",
   reminder: "🔔",
   rating: "★",
   report: "⚑",
   info: "ℹ"
};

function Notifications() {
   const [tab, setTab] = useState("all");
   const [changes, setChanges] = useState(0);

   if (!data.session.userId) {
      return (
         <div className="auth-card">
            <h1>Sign in to see notifications</h1>
            <p className="auth-muted">Updates about your rides and account appear here.</p>
            <Link className="auth-link-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   const all = data.notifications.filter(n => n.userId === data.session.userId);
   all.sort((a, b) => (a.date < b.date ? 1 : -1));
   const unread = all.filter(n => !n.read);
   const shown = tab === "all" ? all : unread;

   function markAllRead() {
      for (let i = 0; i < all.length; i++) {
         all[i].read = true;
      }
      setChanges(changes + 1);
   }

   function markOneRead(notification) {
      notification.read = true;
      setChanges(changes + 1);
   }

   function rowContent(n) {
      return (
         <>
            <span className="notif-icon">{icons[n.type] || icons.info}</span>
            <span className="notif-body">
               {n.title && <span className="notif-title">{n.title}</span>}
               <span>{n.text}</span>
               <span className="auth-hint">{formatDate(n.date)}</span>
            </span>
            {!n.read && <span className="notif-new">New</span>}
         </>
      );
   }

   return (
      <div>
         <NavBar />
         <div className="auth-card">
            <h1>Notifications</h1>

            <div className="notif-tabs">
               <button type="button" className={tab === "all" ? "notif-tab notif-tab-on" : "notif-tab"}
                  onClick={() => setTab("all")}>All</button>
               <button type="button" className={tab === "unread" ? "notif-tab notif-tab-on" : "notif-tab"}
                  onClick={() => setTab("unread")}>Unread ({unread.length})</button>
            </div>

            {unread.length > 0 && (
               <button type="button" className="notif-mark" onClick={markAllRead}>Mark all as read</button>
            )}

            {shown.length === 0 ? (
               <div className="account-box">
                  <p className="auth-icon">🔔</p>
                  <p className="auth-center">{tab === "all" ? "No notifications yet" : "No unread notifications"}</p>
                  <p className="auth-hint auth-center">Updates about your requests, trips and ratings appear here.</p>
               </div>
            ) : (
               <div className="account-box notif-list">
                  {shown.map(n => (
                     n.link ?
                        <Link key={n.id} to={n.link} onClick={() => markOneRead(n)}
                           className={n.read ? "notif-item" : "notif-item notif-unread"}>
                           {rowContent(n)}
                        </Link> :
                        <button type="button" key={n.id} onClick={() => markOneRead(n)}
                           className={n.read ? "notif-item" : "notif-item notif-unread"}>
                           {rowContent(n)}
                        </button>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}

export default Notifications;