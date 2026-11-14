import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import data from "../shared/data";
import NavBar from "../shared/NavBar";
import { expireRideRequests, rideCredits } from "./MyRides";
import "./CreditHistory.css";

const pageSize = 20;
const transactionTypes = {
   starting: "Starting credits", earned: "Earned", spent: "Spent",
   held: "Held", released: "Released", admin: "Admin correction"
};
const filterKeys = ["all", "earned", "spent", "held", "released", "admin"];
const dateFormat = { day: "numeric", month: "short", year: "numeric" };

function CreditEntry({ entry }) {
   const date = new Date(entry.date);
   const validDate = !isNaN(date.getTime());
   const admin = entry.type === "admin";
   const reviewer = admin && data.users.find((user) => user.id === entry.adminId);
   const changesAvailability = entry.type === "held" || entry.type === "released";
   const sign = entry.amount < 0 ? "−" : entry.amount > 0 ? "+" : "";
   let tone = "";
   if (admin) tone = "rider-credit-positive";
   if (entry.type === "spent" && /^did not travel\b/i.test(entry.label)) tone = "rider-credit-negative";

   return (
      <li className="rider-credit-card rider-credit-row rider-credit-entry">
         <div>
            <strong>{transactionTypes[entry.type] || entry.type}</strong>
            <p>{entry.label}</p>
            {admin && entry.justification && <p><q>{entry.justification}</q></p>}
            {reviewer && <p className="rider-credit-muted">— Admin {reviewer.name}</p>}
            <p className="rider-credit-muted">
               {validDate ? <time dateTime={entry.date}>{date.toLocaleDateString("en-GB", dateFormat)}</time> : "Date unavailable"}
            </p>
         </div>
         <strong className={tone}>
            {sign}{Math.abs(entry.amount)}{changesAvailability && " available"}
         </strong>
      </li>
   );
}

function newestFirst(first, second) {
   const firstTime = new Date(first.date).getTime();
   const secondTime = new Date(second.date).getTime();
   if (isNaN(firstTime)) return isNaN(secondTime) ? 0 : 1;
   if (isNaN(secondTime)) return -1;
   return secondTime - firstTime;
}

function CreditHistory() {
   const [params, setParams] = useSearchParams();
   const requestedFilter = params.get("type");
   const filter = filterKeys.includes(requestedFilter) ? requestedFilter : "all";
   const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
   const refreshHistory = useState(0)[1];
   const user = data.users.find((entry) => entry.id === data.session.userId);
   let message = "";
   if (!user) message = "Sign in to view your credit history.";
   else if (user.status === "suspended") message = "Your account is suspended.";
   else if (!user.verified) message = "Verify your email before viewing your credit history.";

   useEffect(() => {
      if (!message && expireRideRequests(user.id)) refreshHistory((version) => version + 1);
   });

   if (message) return <>
      <NavBar />
      <main className="rider-credit-page">
         <h1>Credit history</h1>
         <p>{message}</p>
         {!user && <Link to="/account/sign-in">Sign in</Link>}
      </main>
   </>;

   const credits = rideCredits(user.id);
   const entries = data.credits.filter((entry) => {
      if (entry.userId !== user.id) return false;
      if (filter === "all") return true;
      return entry.type === filter || (filter === "earned" && entry.type === "starting");
   }).sort(newestFirst);
   const pages = Math.max(1, Math.ceil(entries.length / pageSize));
   const currentPage = Math.min(page, pages);
   const start = (currentPage - 1) * pageSize;
   const rows = entries.slice(start, start + pageSize);

   function selectView(type, nextPage = 1) {
      const next = {};
      if (type !== "all") next.type = type;
      if (nextPage > 1) next.page = String(nextPage);
      setParams(next);
   }

   return <>
      <NavBar />
      <main className="rider-credit-page">
         <Link to="/rider/rides">← Back to My Rides</Link>
         <h1>Credit history</h1>
         <dl className="rider-credit-card rider-credit-row" aria-label="Credit summary">
            <div><dt>Balance</dt><dd>{credits.available + credits.held}</dd></div>
            <div><dt>Available</dt><dd>{credits.available}</dd></div>
            <div><dt>Held</dt><dd>{credits.held}</dd></div>
         </dl>
         <div className="rider-credit-row" role="group" aria-label="Filter by type">
            {filterKeys.map((option) => (
               <button className="rider-credit-button" key={option} type="button"
                  aria-pressed={filter === option} onClick={() => selectView(option)}>
                  {transactionTypes[option] || "All"}
               </button>
            ))}
         </div>
         {rows.length ? (
            <ul className="rider-credit-ledger" aria-label="Credit transactions">
               {rows.map((entry) => <CreditEntry key={entry.id} entry={entry} />)}
            </ul>
         ) : (
            <section className="rider-credit-card">
               <h2>{filter === "all" ? "No credit transactions yet" : "No " + transactionTypes[filter].toLowerCase() + " entries"}</h2>
               {filter !== "all" &&
                  <button className="rider-credit-button" type="button" onClick={() => selectView("all")}>Show all</button>}
            </section>
         )}
         <p className="rider-credit-muted">Held credits are reserved for pending or accepted seats. They return to available credits when the request is declined, cancelled or expires, and are spent when the trip is completed.</p>
         {entries.length > 0 && <nav className="rider-credit-row rider-credit-pagination" aria-label="Credit history pages">
            <button className="rider-credit-button" type="button" disabled={currentPage === 1}
               onClick={() => selectView(filter, currentPage - 1)}>Previous</button>
            <span aria-live="polite">Page {currentPage} of {pages} · {pageSize} per page</span>
            <button className="rider-credit-button" type="button" disabled={currentPage === pages}
               onClick={() => selectView(filter, currentPage + 1)}>Next</button>
         </nav>}
      </main>
   </>;
}

export default CreditHistory;

