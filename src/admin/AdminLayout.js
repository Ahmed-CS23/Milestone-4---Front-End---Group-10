import { Link, NavLink, useNavigate } from "react-router-dom";
import data from "../shared/data";
import admin from "./adminData";
import "./AdminLayout.css";

// The frame around every admin page: sidebar on the left, title bar on top (Figma WF-51 to WF-58).
// Usage: <AdminLayout title="Users"> ...page content... </AdminLayout>
function AdminLayout(props) {
    const navigate = useNavigate();
    const signedIn = admin.getAdmin();

    // Admins only (NFR-04). Anyone else gets this screen instead of the page.
    if (!signedIn) {
        return (
            <div className="admin-guard">
                <h1>Administrators only</h1>
                <p>Sign in with an administrator account to open the moderation console.</p>
                <Link to="/admin/sign-in">Go to admin sign-in</Link>
            </div>
        );
    }

    // Numbers for the pink badges in the sidebar.
    const pendingVerifications = data.users.filter(e => e.vehicleStatus === "pending").length;
    const openReports = data.reports.filter(e => e.status !== "closed").length;
    const pendingApprovals = data.creditApprovals.filter(e => e.status === "pending").length;

    const links = [
        { to: "/admin", label: "Dashboard", count: 0 },
        { to: "/admin/verifications", label: "Verifications", count: pendingVerifications },
        { to: "/admin/trips", label: "Trips", count: 0 },
        { to: "/admin/reports", label: "Reports", count: openReports },
        { to: "/admin/users", label: "Users", count: 0 },
        { to: "/admin/ratings", label: "Ratings & credits", count: pendingApprovals }
    ];

    function handleSignOut() {
        data.session.userId = null;
        navigate("/admin/sign-in");
    }

    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <strong>UniRide Admin</strong>
                    <span>Moderation console</span>
                </div>

                <nav className="admin-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === "/admin"}
                            className={({ isActive }) => isActive ? "admin-nav-link active" : "admin-nav-link"}>
                            <span>{link.label}</span>
                            {link.count > 0 && <span className="admin-badge">{link.count}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-user">
                    <strong>{signedIn.name} · Administrator</strong>
                    <button type="button" className="admin-signout" onClick={handleSignOut}>Sign out</button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <h1>{props.title}</h1>
                    <span className="admin-session">🔒 Privileged session · expires after 30 min idle</span>
                </header>

                <div className="admin-content">
                    {props.children}
                </div>
            </main>
        </div>
    );
}

export default AdminLayout;
