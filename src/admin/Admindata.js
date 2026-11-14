import data from "../shared/data";

// Term 261 dates (term calendar setting). Same end date the driver pages use.
const termStart = "2026-08-23";
const termEnd = "2026-12-17";

// Sample admin data, added once so the admin pages have something to show.
// Added here instead of in shared/data.js so we don't get merge conflicts with the team.
function addAdminDemoData() {
    if (data.adminDemoAdded) {
        return;
    }
    data.adminDemoAdded = true;

    // A second administrator, needed later for the second-approval flow (WF-58c).
    data.users.push({ id: "a2", name: "Omar S.", email: "omar.admin@kfupm.edu.sa", password: "admin1234", role: "admin", verified: true, status: "active", vehicleStatus: "none", vehicle: null, schedule: [] });

    // Same fields that auth/Report.js uses when a user submits a report.
    data.reports.push({ id: "R-1001", reporterId: "u3", subjectId: "u2", tripId: "t3", category: "Unsafe driving", details: "Drove too fast on the highway.", status: "open", outcome: "", note: "", date: "2026-11-06" });
    data.reports.push({ id: "R-1002", reporterId: "u1", subjectId: "u6", tripId: null, category: "Asked for money", details: "Asked me to pay cash for the ride.", status: "escalated", outcome: "", note: "", date: "2026-11-02" });

    // Credit adjustments above 5 credits wait for a second administrator (FR-A7 step 3).
    data.creditApprovals = [
        { id: "ca1", userId: "u3", amount: 6, justification: "Refund for three trips cancelled by the driver.", requestedBy: "a2", status: "pending", date: "2026-11-10" }
    ];

    // Every admin action is written here (FR-A3 step 4, FR-A4 step 4).
    data.auditLog = [];
}

addAdminDemoData();

// The signed-in administrator, or undefined.
function getAdmin() {
    return data.users.find(e => e.id === data.session.userId && e.role === "admin");
}

// Is a date ("2026-11-15" or "2026-11-15T07:15") between from and to? Both ends included.
function inRange(date, from, to) {
    const day = date.substring(0, 10);
    return day >= from && day <= to;
}

const admin = {
    termStart: termStart,
    termEnd: termEnd,
    getAdmin: getAdmin,
    inRange: inRange
};

export default admin;