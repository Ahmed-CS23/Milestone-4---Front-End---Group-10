function formatDate(text) {
   if (!text) {
      return "";
   }
   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
   const pieces = text.substring(0, 10).split("-");
   return Number(pieces[2]) + " " + months[Number(pieces[1]) - 1] + " " + pieces[0];
}

export default formatDate;