import { BrowserRouter, Route, Routes } from "react-router-dom";
import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";
import CheckInbox from "./auth/CheckInbox";
import Verify from "./auth/Verify";
import Account from "./auth/Account";
import Profile from "./auth/Profile";
import Notifications from "./auth/Notifications";
import Report from "./auth/Report";
import Messages from "./auth/Messages";
import FindRide from "./rider/FindRide";
import TripDetails from "./rider/TripDetails";
import MyRides from "./rider/MyRides";
import CreditHistory from "./rider/CreditHistory";
import RateDriver from "./rider/RateDriver";
import DriverDashboard from "./driver/DriverDashboard";
import MyTrips from "./driver/MyTrips";
import PostTrip from "./driver/PostTrip";
import ManageTrip from "./driver/ManageTrip";
import EditTrip from "./driver/EditTrip";
import CompleteTrip from "./driver/CompleteTrip";
import RateRiders from "./driver/RateRiders";
import MySchedule from "./driver/MySchedule";
import RecurringTrips from "./driver/RecurringTrips";
import AdminSignIn from "./admin/AdminSignIn";
import AdminDashboard from "./admin/AdminDashboard";
import Verifications from "./admin/Verifications";
import VerificationReview from "./admin/VerificationReview";
import AdminTrips from "./admin/AdminTrips";
import AdminTripDetails from "./admin/AdminTripDetails";
import Reports from "./admin/Reports";
import ReportDetails from "./admin/ReportDetails";
import Users from "./admin/Users";
import UserDetails from "./admin/UserDetails";
import RatingsCredits from "./admin/RatingsCredits";
import NotFound from "./shared/NotFound";

function App() {
   return (
      <BrowserRouter>
         <Routes>
            <Route path="/" element={<SignIn />} />
            <Route path="/account/sign-up" element={<SignUp />} />
            <Route path="/account/check-inbox" element={<CheckInbox />} />
            <Route path="/account/verify" element={<Verify />} />
            <Route path="/account/sign-in" element={<SignIn />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/profile/:userId" element={<Profile />} />
            <Route path="/account/notifications" element={<Notifications />} />
            <Route path="/account/report" element={<Report />} />
            <Route path="/account/messages/:tripId" element={<Messages />} />

            <Route path="/rider" element={<FindRide />} />
            <Route path="/rider/trip/:tripId" element={<TripDetails />} />
            <Route path="/rider/rides" element={<MyRides />} />
            <Route path="/rider/credits" element={<CreditHistory />} />
            <Route path="/rider/rate/:bookingId" element={<RateDriver />} />

            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/driver/trips" element={<MyTrips />} />
            <Route path="/driver/post" element={<PostTrip />} />
            <Route path="/driver/trips/:tripId" element={<ManageTrip />} />
            <Route path="/driver/trips/:tripId/edit" element={<EditTrip />} />
            <Route path="/driver/trips/:tripId/complete" element={<CompleteTrip />} />
            <Route path="/driver/trips/:tripId/rate" element={<RateRiders />} />
            <Route path="/driver/schedule" element={<MySchedule />} />
            <Route path="/driver/recurring" element={<RecurringTrips />} />

            <Route path="/admin/sign-in" element={<AdminSignIn />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/verifications" element={<Verifications />} />
            <Route path="/admin/verifications/:userId" element={<VerificationReview />} />
            <Route path="/admin/trips" element={<AdminTrips />} />
            <Route path="/admin/trips/:tripId" element={<AdminTripDetails />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/reports/:reportId" element={<ReportDetails />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/users/:userId" element={<UserDetails />} />
            <Route path="/admin/ratings" element={<RatingsCredits />} />

            <Route path="*" element={<NotFound />} />
         </Routes>
      </BrowserRouter>
   );
}

export default App;
