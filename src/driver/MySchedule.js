import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import NavBar from "../shared/NavBar";
import TopBar, { Toast, Banner, FieldError } from "./DriverUI";
import utils from "./driverUtils";
import "./Driver.css";
import "./MySchedule.css";

const emptyRow = { day: "Sun", start: "", end: "", course: "" };
const icsDays = { SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat" };

function isTime(text) {
   return /^[0-2][0-9]:[0-5][0-9]$/.test(text);
}

function rowProblem(row) {
   if (row.start === "" && row.end === "") {
      return "Start and end times are required.";
   }
   if (row.start === "") {
      return "Start time is required.";
   }
   if (row.end === "") {
      return "End time is required.";
   }
   if (row.start >= row.end) {
      return "Start must be before end.";
   }
   return "";
}

// CSV: one class per line, "Day,Start,End,Course" (e.g. Sun,08:00,08:50,SWE 363).
function parseCsv(text) {
   const rows = [];
   const problems = [];
   const lines = text.split(/\r?\n/);
   let count = 0;
   for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "" || /^day\s*,/i.test(line)) {
         continue;
      }
      count = count + 1;
      const parts = line.split(",").map(p => p.trim());
      const day = parts[0] ? parts[0].substring(0, 1).toUpperCase() + parts[0].substring(1, 3).toLowerCase() : "";
      if (utils.days.indexOf(day) === -1) {
         problems.push("row " + count + " (unknown day)");
         continue;
      }
      const row = {
         day: day,
         start: isTime(parts[1] || "") ? parts[1] : "",
         end: isTime(parts[2] || "") ? parts[2] : "",
         course: parts[3] || ""
      };
      const problem = rowProblem(row);
      if (problem !== "") {
         problems.push("row " + count + " (" + problem.replace(".", "").toLowerCase() + ")");
         row.problem = problem;
      }
      rows.push(row);
   }
   return { rows: rows, problems: problems, count: count };
}

// ICS: weekly events with DTSTART, DTEND, SUMMARY and RRULE BYDAY.
function parseIcs(text) {
   const rows = [];
   const problems = [];
   const events = text.split("BEGIN:VEVENT").slice(1);
   for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const start = (ev.match(/DTSTART[^:]*:\d{8}T(\d{2})(\d{2})/) || []);
      const end = (ev.match(/DTEND[^:]*:\d{8}T(\d{2})(\d{2})/) || []);
      const date = (ev.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/) || []);
      const summary = (ev.match(/SUMMARY:(.*)/) || [])[1] || "";
      const byDay = (ev.match(/BYDAY=([A-Z,]+)/) || [])[1];
      let dayList = [];
      if (byDay) {
         dayList = byDay.split(",").map(d => icsDays[d]).filter(d => d);
      }
      else if (date.length > 0) {
         dayList = [utils.days[new Date(date[1] + "-" + date[2] + "-" + date[3] + "T12:00").getDay()]];
      }
      if (dayList.length === 0) {
         problems.push("row " + (i + 1) + " (no day)");
         continue;
      }
      for (let d = 0; d < dayList.length; d++) {
         const row = {
            day: dayList[d],
            start: start.length > 0 ? start[1] + ":" + start[2] : "",
            end: end.length > 0 ? end[1] + ":" + end[2] : "",
            course: summary.trim()
         };
         const problem = rowProblem(row);
         if (problem !== "") {
            problems.push("row " + (i + 1) + " (" + problem.replace(".", "").toLowerCase() + ")");
            row.problem = problem;
         }
         rows.push(row);
      }
   }
   return { rows: rows, problems: problems, count: events.length };
}

function sortRows(list) {
   const copy = list.map(r => ({ day: r.day, start: r.start, end: r.end, course: r.course.trim() }));
   copy.sort((a, b) => {
      const dayDiff = utils.days.indexOf(a.day) - utils.days.indexOf(b.day);
      return dayDiff !== 0 ? dayDiff : (a.start > b.start ? 1 : -1);
   });
   return copy;
}

function daySummary(list) {
   const used = [];
   for (let i = 0; i < list.length; i++) {
      if (used.indexOf(list[i].day) === -1) {
         used.push(list[i].day);
      }
   }
   return list.length + (list.length === 1 ? " class" : " classes") + " on " + used.length + (used.length === 1 ? " day" : " days");
}

// WF-38 manual entry, WF-38a import, WF-38b upload failed, WF-38c rows unreadable,
// WF-38d preview, WF-38f saved (FR-D3 steps 1–4). Riders use the same page (assumption A-10).
function MySchedule() {
   const [params] = useSearchParams();
   const user = utils.getSignedInUser();
   const hasSchedule = user && user.schedule.length > 0;
   const [view, setView] = useState(params.get("tab") === "import" ? "import" : (hasSchedule ? "saved" : "manual"));
   const [rows, setRows] = useState(hasSchedule ? user.schedule.map(r => ({...r})) : [{...emptyRow}]);
   const [errors, setErrors] = useState({});
   const [uploadError, setUploadError] = useState("");
   const [attention, setAttention] = useState("");
   const [toast, setToast] = useState("");

   if (!user) {
      return (
         <div className="driver-card">
            <div className="driver-result">
               <h2>Sign in to see your schedule</h2>
               <p className="driver-muted">Your class times help match rides to your timetable.</p>
            </div>
            <Link className="driver-button" to="/account/sign-in">Sign in</Link>
         </div>
      );
   }

   function changeRow(index, name, value) {
      setRows(rows.map((r, i) => (i === index ? {...r, [name]: value, problem: ""} : r)));
   }

   function checkRows() {
      const newErrors = {};
      for (let i = 0; i < rows.length; i++) {
         const problem = rowProblem(rows[i]);
         if (problem !== "") {
            newErrors[i] = problem;
         }
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
   }

   function save(list) {
      const sorted = sortRows(list);
      user.schedule = sorted;
      setRows(sorted);
      setToast("Schedule saved (" + daySummary(sorted) + ").");
      setAttention("");
      setView("saved");
   }

   function handleManualSave(event) {
      event.preventDefault();
      if (rows.length === 0) {
         setErrors({ all: "Add at least one class." });
         return;
      }
      if (!checkRows()) {
         return;
      }
      if (attention !== "") {
         setRows(sortRows(rows));
         setView("preview");
         return;
      }
      save(rows);
   }

   // FR-D3 step 2: supported format (.ics or .csv) and under 2 MB; nothing is saved before the preview.
   function handleFile(event) {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) {
         return;
      }
      const isIcs = /\.ics$/i.test(file.name);
      const isCsv = /\.csv$/i.test(file.name);
      if ((!isIcs && !isCsv) || file.size >= 2 * 1024 * 1024) {
         setUploadError("This file can’t be imported. Use an .ics or .csv file smaller than 2 MB (you chose " +
            file.name + ", " + (Math.round(file.size / 1024 / 102.4) / 10) + " MB). Nothing was saved.");
         return;
      }
      setUploadError("");
      const reader = new FileReader();
      reader.onload = () => {
         const result = isIcs ? parseIcs(reader.result) : parseCsv(reader.result);
         if (result.rows.length === 0) {
            setUploadError("No classes could be read from " + file.name + ". Nothing was saved.");
            return;
         }
         if (result.problems.length > 0) {
            // WF-38c: fall back to the manual form, pre-filled with what could be read.
            setAttention("We couldn’t read " + result.problems.length + " of " + result.count + " rows: " +
               result.problems.join(", ") + ". Nothing was saved. The readable rows are filled in below — complete or remove the highlighted ones.");
            const filled = result.rows;
            const newErrors = {};
            for (let i = 0; i < filled.length; i++) {
               if (filled[i].problem) {
                  newErrors[i] = filled[i].problem;
               }
            }
            setRows(filled);
            setErrors(newErrors);
            setView("manual");
            return;
         }
         setRows(sortRows(result.rows));
         setView("preview");
      };
      reader.readAsText(file);
   }

   function dayList(list, editable) {
      return (
         <div className="driver-days">
            {utils.days.filter(d => list.find(r => r.day === d)).map(d => (
               <div key={d} className="driver-day">
                  <span className="driver-strong driver-day-name">{d}</span>
                  <div className="driver-day-classes">
                     {list.filter(r => r.day === d).map((r, i) => (
                        <span key={i}>{utils.formatTime(r.start).replace(/ (AM|PM)$/, "")}–{utils.formatTime(r.end)}{r.course ? " · " + r.course : ""}</span>
                     ))}
                  </div>
                  {editable && <button type="button" className="driver-text-link" onClick={() => setView("manual")}>Edit</button>}
               </div>
            ))}
         </div>
      );
   }

   const tabs = (
      <div className="driver-tabs" role="tablist">
         <button type="button" role="tab" aria-selected={view === "manual"}
            className={view === "manual" ? "driver-tab driver-tab-on" : "driver-tab"} onClick={() => setView("manual")}>Enter manually</button>
         <button type="button" role="tab" aria-selected={view === "import"}
            className={view === "import" ? "driver-tab driver-tab-on" : "driver-tab"} onClick={() => setView("import")}>Import file</button>
      </div>
   );

   return (
      <div>
         <NavBar />
         <div className="driver-card">
            <TopBar title="My Schedule" back={user.vehicleStatus === "approved" ? "/driver" : "/account"} />

            {view === "saved" && (
               <>
                  <Toast text={toast} />
                  {dayList(user.schedule, true)}
                  {user.vehicleStatus === "approved" && (
                     <>
                        <Link className="driver-button" to="/driver/recurring">Generate recurring trips</Link>
                        <p className="driver-hint">Drivers: proposes one morning and one return trip for each class day.</p>
                     </>
                  )}
                  <Link className="driver-center driver-strong" to="/rider">Riders: use “Fits my schedule” when searching</Link>
               </>
            )}

            {view === "preview" && (
               <>
                  <h2>Review your schedule</h2>
                  <p className="driver-hint">{daySummary(rows)}. Correct anything before saving.</p>
                  {dayList(rows, true)}
                  <button type="button" className="driver-button" onClick={() => save(rows)}>Confirm and save</button>
                  <button type="button" className="driver-text-link driver-center" onClick={() => setView("import")}>Upload a different file</button>
               </>
            )}

            {(view === "manual" || view === "import") && tabs}

            {view === "manual" && (
               <form className="driver-schedule" onSubmit={handleManualSave} noValidate>
                  {attention !== "" ?
                     <Banner type="warning" title="Some rows need attention"><p>{attention}</p></Banner> :
                     <p className="driver-hint">Your schedule is private. It is used for “Fits my schedule” and to propose recurring trips.</p>}
                  {rows.map((row, i) => (
                     <div key={i} className={errors[i] ? "driver-box driver-class driver-class-bad" : "driver-box driver-class"}>
                        <div className="driver-class-times">
                           <div className="driver-field">
                              <label htmlFor={"day" + i}>Day *</label>
                              <select id={"day" + i} value={row.day} onChange={e => changeRow(i, "day", e.target.value)}>
                                 {utils.days.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                           </div>
                           <div className="driver-field">
                              <label htmlFor={"start" + i}>Start *</label>
                              <input type="time" id={"start" + i} className={errors[i] && /Start|before/.test(errors[i]) ? "driver-invalid" : ""}
                                 value={row.start} onChange={e => changeRow(i, "start", e.target.value)} />
                           </div>
                           <div className="driver-field">
                              <label htmlFor={"end" + i}>End *</label>
                              <input type="time" id={"end" + i} className={errors[i] && /End|before/.test(errors[i]) ? "driver-invalid" : ""}
                                 value={row.end} onChange={e => changeRow(i, "end", e.target.value)} />
                           </div>
                        </div>
                        <FieldError text={errors[i]} />
                        <label htmlFor={"course" + i}>Course (optional)</label>
                        <div className="driver-class-course">
                           <input type="text" id={"course" + i} placeholder="e.g. SWE 363" value={row.course}
                              onChange={e => changeRow(i, "course", e.target.value)} />
                           <button type="button" className="driver-trash" aria-label={"Remove class " + (i + 1)}
                              onClick={() => { setRows(rows.filter((r, k) => k !== i)); setErrors({}); }}>🗑</button>
                        </div>
                     </div>
                  ))}
                  <FieldError text={errors.all} />
                  <button type="button" className="driver-text-link" onClick={() => setRows(rows.concat([{...emptyRow}]))}>+ Add class</button>
                  <input type="submit" value={attention !== "" ? "Review schedule" : "Save schedule"} />
               </form>
            )}

            {view === "import" && (
               <>
                  <p className="driver-hint">Your schedule is private. It is used for “Fits my schedule” and to propose recurring trips.</p>
                  {uploadError && <Banner type="error" title="Upload failed"><p>{uploadError}</p></Banner>}
                  <div className="driver-drop">
                     <span className="driver-result-icon" aria-hidden="true">⇧</span>
                     <p className="driver-strong">Upload your schedule file</p>
                     <p className="driver-hint">.ics or .csv exported from the university portal · smaller than 2 MB</p>
                     <label className="driver-secondary driver-file">
                        Choose file
                        <input type="file" accept=".ics,.csv" onChange={handleFile} />
                     </label>
                  </div>
                  <p className="driver-hint">Nothing is saved until you confirm the preview.</p>
                  {uploadError && <button type="button" className="driver-text-link driver-center" onClick={() => setView("manual")}>Enter classes manually instead</button>}
               </>
            )}
         </div>
      </div>
   );
}

export default MySchedule;
