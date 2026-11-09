const data = {
   session: {
      userId: null
   },
   users: [
      { id: "u1", name: "Faisal A.", email: "faisal.a@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "none", vehicle: null, schedule: [] },
      { id: "u2", name: "Ahmed A.", email: "ahmed.a@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "approved", vehicle: { make: "Toyota", model: "Corolla", colour: "White", plate: "4821RKA", capacity: 4 }, schedule: [{ day: "Sun", start: "08:00", end: "12:50", course: "SWE 363" }] },
      { id: "u3", name: "Majed O.", email: "majed.o@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "none", vehicle: null, schedule: [] },
      { id: "u4", name: "Yasser H.", email: "yasser.h@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "active", vehicleStatus: "pending", vehicle: { make: "Toyota", model: "Camry", colour: "White", plate: "3054HRA", capacity: 4 }, schedule: [] },
      { id: "u5", name: "Nawaf H.", email: "nawaf.h@kfupm.edu.sa", password: "password123", role: "user", verified: false, status: "active", vehicleStatus: "none", vehicle: null, schedule: [] },
      { id: "u6", name: "Rayan F.", email: "rayan.f@kfupm.edu.sa", password: "password123", role: "user", verified: true, status: "suspended", vehicleStatus: "none", vehicle: null, schedule: [] },
      { id: "a1", name: "Noura K.", email: "noura.admin@kfupm.edu.sa", password: "admin1234", role: "admin", verified: true, status: "active", vehicleStatus: "none", vehicle: null, schedule: [] }
   ],
   trips: [
      { id: "t1", driverId: "u2", origin: "Al-Rakah", destination: "KFUPM Gate 2", pickup: "Al-Rakah Pharmacy Corner", departure: "2026-11-15T07:15", seats: 3, seatsLeft: 2, note: "I leave on time.", status: "open" },
      { id: "t2", driverId: "u2", origin: "KFUPM Gate 2", destination: "Al-Rakah", pickup: "KFUPM Gate 2", departure: "2026-11-15T13:30", seats: 3, seatsLeft: 3, note: "", status: "open" },
      { id: "t3", driverId: "u2", origin: "Al-Rakah", destination: "KFUPM Gate 2", pickup: "Al-Rakah Pharmacy Corner", departure: "2026-11-05T07:15", seats: 3, seatsLeft: 2, note: "", status: "completed" }
   ],
   bookings: [
      { id: "b1", tripId: "t1", riderId: "u3", status: "accepted", note: "", late: false },
      { id: "b2", tripId: "t1", riderId: "u1", status: "pending", note: "I will wait at the corner.", late: false },
      { id: "b3", tripId: "t3", riderId: "u1", status: "completed", note: "", late: false }
   ],
   credits: [
      { id: "c1", userId: "u1", type: "starting", amount: 2, label: "Starting credits", date: "2026-08-24" },
      { id: "c2", userId: "u1", type: "spent", amount: -1, label: "Ride with Ahmed A.", date: "2026-11-05" },
      { id: "c3", userId: "u1", type: "held", amount: -1, label: "Request · Sun 15 Nov · Ahmed A.", date: "2026-11-09" },
      { id: "c4", userId: "u2", type: "starting", amount: 2, label: "Starting credits", date: "2026-08-23" },
      { id: "c5", userId: "u2", type: "earned", amount: 1, label: "Trip completed · Thu 5 Nov", date: "2026-11-05" },
      { id: "c6", userId: "u3", type: "starting", amount: 2, label: "Starting credits", date: "2026-08-25" },
      { id: "c7", userId: "u3", type: "held", amount: -1, label: "Request · Sun 15 Nov · Ahmed A.", date: "2026-11-08" }
   ],
   ratings: [],
   reports: [],
   notifications: [],
   messages: []
};

export default data;
