function getInitials(name) {
   const parts = name.split(" ").filter(p => p !== "");
   let initials = parts[0][0];
   if (parts.length > 1) {
      initials = initials + parts[parts.length - 1][0];
   }
   return initials.toUpperCase();
}

function getShortName(name) {
   const parts = name.split(" ").filter(p => p !== "");
   if (parts.length === 1) {
      return parts[0];
   }
   return parts[0] + " " + parts[parts.length - 1][0].toUpperCase() + ".";
}

const names = {
   getInitials: getInitials,
   getShortName: getShortName
};

export default names;