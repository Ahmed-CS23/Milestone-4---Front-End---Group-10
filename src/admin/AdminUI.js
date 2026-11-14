// Small building blocks reused by every admin page. Styles are in Admin.css.

// Dark confirmation bar after an action ("✓ Approved. ...")
function Toast(props) {
   if (!props.text) {
      return null;
   }
   return <p className="admin-toast" role="status">✓ {props.text}</p>;
}

// Coloured status label. tone: "blue", "green", "amber", "red" or "grey"
function Pill(props) {
   return <span className={"admin-pill " + (props.tone || "grey")}>{props.children}</span>;
}

// Dialog on top of a dimmed page. Closes when you click the dark area.
function Modal(props) {
   return (
      <div className="admin-modal-back" onClick={props.onClose}>
         <div className="admin-modal" role="dialog" aria-modal="true" aria-label={props.title}
            onClick={e => e.stopPropagation()}>
            <h2>{props.title}</h2>
            {props.children}
         </div>
      </div>
   );
}

export { Toast, Pill, Modal };
