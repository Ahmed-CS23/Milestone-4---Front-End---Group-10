import { Link } from "react-router-dom";
import names from "../auth/names";

// Small building blocks used by every driver page, drawn after the Figma file (WF-30 to WF-41).

// Top bar with a back arrow and the screen title ("← My trip").
function TopBar(props) {
   return (
      <div className="driver-topbar">
         {props.back && <Link to={props.back} aria-label="Back" className="driver-back">←</Link>}
         <h1>{props.title}</h1>
      </div>
   );
}

// Dark confirmation bar shown after an action ("✓ Trip published ...").
function Toast(props) {
   if (!props.text) {
      return null;
   }
   return <p className="driver-toast" role="status"><span aria-hidden="true">✓</span> {props.text}</p>;
}

// Coloured status label: green, amber, blue, red or grey.
function Pill(props) {
   return <span className={"driver-pill " + (props.tone || "grey")}>{props.children}</span>;
}

// Round initials ("FA") in place of a photo.
function Avatar(props) {
   return <span className="driver-avatar" aria-hidden="true">{names.getInitials(props.name)}</span>;
}

// Info / warning / error box with an optional bold first line.
function Banner(props) {
   const icons = { info: "ⓘ", warning: "⚠", error: "⚠" };
   return (
      <div className={"driver-banner " + props.type} role={props.type === "error" ? "alert" : undefined}>
         <span className="driver-banner-icon" aria-hidden="true">{icons[props.type]}</span>
         <div>
            {props.title && <p className="driver-banner-title">{props.title}</p>}
            {props.children}
         </div>
      </div>
   );
}

// Error under a field, with the warning sign used in Figma.
function FieldError(props) {
   if (!props.text) {
      return null;
   }
   return <p className="driver-error"><span aria-hidden="true">⚠</span> {props.text}</p>;
}

// Tone of a trip status pill.
function stateTone(state) {
   if (state === "open" || state === "completed") {
      return "green";
   }
   if (state === "full") {
      return "amber";
   }
   if (state === "awaiting") {
      return "blue";
   }
   if (state === "removed") {
      return "red";
   }
   return "grey";
}

export { Toast, Pill, Avatar, Banner, FieldError, stateTone };
export default TopBar;
