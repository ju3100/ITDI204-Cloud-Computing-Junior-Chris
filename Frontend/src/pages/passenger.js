import { useState, useCallback, useEffect } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { api } from "../api/APIBook";
import "../styles/Passenger.css";
import { io } from "socket.io-client";
import LiveMap from "../components/LiveMap";

const socket = io("http://localhost:5001");

export default function Passenger() {
  // GET LOGGED USER
  const [currentUser] = useState(() => {
    try {
      const local = localStorage.getItem("user");

      if (local && local !== "undefined") {
        return JSON.parse(local);
      }

      const session = sessionStorage.getItem("user");

      if (session && session !== "undefined") {
        return JSON.parse(session);
      }

      return null;
    } catch (e) {
      return null;
    }
  });

  // PASSENGER PROFILE
  const passenger = {
    username: currentUser?.username || "",
    contact: currentUser?.contact || "",
    email: currentUser?.email || ""
  };

  const [menuOpen, setMenuOpen] = useState(false);

  // AVAILABLE TRIPS
  const [trips, setTrips] = useState([]);

  // MY BOOKINGS
  const [bookings, setBookings] = useState([]);

  // NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);

  // OTHER STATES
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("summary");
  const [tripQuery, setTripQuery] = useState("");

  // ADD NOTIFICATION
  const addNotification = (msg) => {
    setNotifications((prev) => [
      { id: Date.now(), msg },
      ...prev
    ]);
  };

  // REMOVE NOTIFICATION
  const dismissNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((n) => n.id !== id)
    );
  };

  // LOAD AVAILABLE TRIPS
  const loadTrips = useCallback(() => {
    setLoading(true);

    api.getTrips()
      .then((data) => {
        const now = new Date();

        const active = (Array.isArray(data) ? data : []).filter((t) => {
          const inFuture =
            t.type === "bus"
              ? true
              : t.endTime
                ? !isNaN(new Date(t.endTime)) &&
                  new Date(t.endTime) > now
                : false;

          return (
            inFuture &&
            t.status !== "Completed" &&
            t.status !== "cancelled" &&
            t.status !== "Full" &&
            t.status !== "Booked" &&
            (t.capacity
              ? (t.booked || 0) < t.capacity
              : true)
          );
        });

        setTrips(active);
      })
      .catch(() => {
        setMessage("Failed to load trips");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // LOAD MY BOOKINGS
  const loadBookings = useCallback(() => {
    api.getBookings()
      .then((data) => {
        const myBookings = (Array.isArray(data) ? data : []).filter(
          (b) => b.user === currentUser?.username
        );

        setBookings(myBookings);
      })
      .catch(() => {
        console.log("Failed to load bookings");
      });
  }, [currentUser]);

  // Derived KPIs
  const totalBookings = bookings.length;
  const upcomingTripsCount = trips.length;
  const totalSpent = bookings.reduce((sum, b) => {
    const price = Number(b.price) || 0;
    return sum + price * (Number(b.passengers) || 1);
  }, 0);

  // LIVE SOCKET EFFECT
  useEffect(() => {
    loadTrips();
    loadBookings();

    socket.on("tripLocationUpdated", (data) => {
      setTrips((prevTrips) =>
        prevTrips.map((t) =>
          t.id === data.tripId
            ? { ...t, location: data.location }
            : t
        )
      );
    });

    return () => {
      socket.off("tripLocationUpdated");
    };
  }, [loadTrips, loadBookings]);

  // BOOK TRIP
  const bookTrip = async (tripId) => {
    try {
      await api.createBooking({
        tripId,
        user: passenger.username,
        passengers: 1,
        status: "pending"
      });

      // For taxi/private trips mark booked immediately
      const trip = trips.find((t) => t.id === tripId);

      if (
        trip &&
        (trip.type === "taxi" || trip.type === "private")
      ) {
        await api.updateTrip(tripId, {
          ...trip,
          status: "Booked"
        });
      }

      setMessage("Booking request sent!");
      addNotification("Booking request sent to driver");

      loadBookings();
      loadTrips();
    } catch (err) {
      setMessage("Booking failed: " + err.message);
    }
  };

  return (
    <div className="passenger-container fade-in admin-style">

      {/* HEADER */}
      <div className="role-header">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle dashboard menu"
        >
          {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="role-menu">
          <button
            className={activeSection === "summary" ? "active" : ""}
            onClick={() => {
              setActiveSection("summary");
              setMenuOpen(false);
            }}
          >
            Summary
          </button>

          <button
            className={activeSection === "bookings" ? "active" : ""}
            onClick={() => {
              setActiveSection("bookings");
              setMenuOpen(false);
            }}
          >
            Booking History
          </button>

          <button
            className={activeSection === "trips" ? "active" : ""}
            onClick={() => {
              setActiveSection("trips");
              setMenuOpen(false);
            }}
          >
            Available Trips
          </button>
        </div>
      )}

      {/* TABS */}
      <div className="passenger-tabs">
        <button
          className={activeSection === "summary" ? "tab active" : "tab"}
          onClick={() => setActiveSection("summary")}
        >
          Summary
        </button>

        <button
          className={activeSection === "bookings" ? "tab active" : "tab"}
          onClick={() => setActiveSection("bookings")}
        >
          Booking History
        </button>

        <button
          className={activeSection === "trips" ? "tab active" : "tab"}
          onClick={() => setActiveSection("trips")}
        >
          Available Trips
        </button>
      </div>

      {/* KPI ROW */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-title">Upcoming Trips</div>
          <div className="kpi-value">{upcomingTripsCount}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Your Bookings</div>
          <div className="kpi-value">{totalBookings}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Total Spent</div>
          <div className="kpi-value">VUV {totalSpent.toLocaleString()}</div>
        </div>
      </div>

      {/* SUMMARY */}
      {activeSection === "summary" && (
        <div className="passenger-summary-card fade-in">
          <h3>Profile Summary</h3>

          <div className="summary-row">
            <span>Username</span>
            <strong>{passenger.username || "Not available"}</strong>
          </div>

          <div className="summary-row">
            <span>Contact</span>
            <strong>{passenger.contact || "Not available"}</strong>
          </div>

          <div className="summary-row">
            <span>Email</span>
            <strong>{passenger.email || "Not available"}</strong>
          </div>
        </div>
      )}

      {/* MESSAGE */}
      {message && (
        <div className="info">
          {message}
        </div>
      )}

      {/* LOADING */}
      {loading && <p>Loading trips...</p>}

      {/* NOTIFICATIONS */}
      {notifications.length > 0 && (
        <div className="notifications">
          <h3>Notifications</h3>

          {notifications.map((n) => (
            <div key={n.id} className="notification">
              {n.msg}

              <button onClick={() => dismissNotification(n.id)}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* BOOKINGS */}
      {activeSection === "bookings" && (
        <div className="booking-section">
          <h3>Booking History</h3>

          {bookings.length === 0 ? (
            <p>No bookings yet</p>
          ) : (
            <div className="booking-grid fade-in">
              {bookings.map((b) => {
                const trip = trips.find(
                  (t) => t.id === b.tripId
                );

                return (
                  <div key={b.id} className="booking-card">
                    <h4>Trip #{b.tripId}</h4>

                    <p>
                      <strong>Status:</strong> {b.status}
                    </p>

                    <p>
                      <strong>Passengers:</strong>{" "}
                      {b.passengers || 1}
                    </p>

                    <p>
                      <strong>Vehicle:</strong>{" "}
                      {b.vehicle ||
                        (trip
                          ? (
                              trip.vehicleType ||
                              trip.busSize ||
                              trip.type
                            )
                          : "N/A")}
                    </p>

                    {trip &&
                      trip.location &&
                      trip.location.lat && (
                        <LiveMap
                          location={trip.location}
                          destinationText={`Driver: ${trip.driver}`}
                        />
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TRIPS */}
      {activeSection === "trips" && (
        <div className="trips-section">
          <h3>Available Trips</h3>

          <div className="trips-controls">
            <input
              className="trip-search"
              placeholder="Search by from, to, driver or type"
              value={tripQuery}
              onChange={(e) => setTripQuery(e.target.value)}
            />
          </div>

          <div className="trip-grid fade-in">
            {trips.filter(
              (t) =>
                t.status !== "Full" &&
                t.status !== "Booked" &&
                (`${t.from} ${t.to} ${t.driver} ${t.type}`.toLowerCase().includes(tripQuery.toLowerCase()))
            ).length === 0 ? (
              <p>No available trips</p>
            ) : (
              trips
                .filter(
                  (t) =>
                    t.status !== "Full" &&
                    t.status !== "Booked" &&
                    (`${t.from} ${t.to} ${t.driver} ${t.type}`.toLowerCase().includes(tripQuery.toLowerCase()))
                )
                .map((trip) => (
                  <div key={trip.id} className="trip-card">
                    <h3>
                      {trip.type.toUpperCase()}
                      {trip.vehicleType
                        ? ` - ${trip.vehicleType}`
                        : trip.busSize
                          ? ` - ${trip.busSize}`
                          : ""}
                    </h3>
                    <div className="trip-meta">
                      <div className="trip-route">{trip.from} → {trip.to}</div>
                      <div className="trip-time">{trip.time ? new Date(trip.time).toLocaleString() : (trip.startTime ? new Date(trip.startTime).toLocaleString() : 'TBD')}</div>
                    </div>

                    {trip.type === "bus" ? (
                      <>
                        <p>
                          <strong>Driver:</strong>{" "}
                          {trip.driver}
                        </p>

                        <p>
                          <strong>Contact:</strong>{" "}
                          {trip.contact}
                        </p>

                        <p>
                          {trip.from} → {trip.to}
                        </p>

                        <p>
                          {new Date(
                            trip.time
                          ).toLocaleString()}
                        </p>

                        <p>
                          Available Seats:{" "}
                          {trip.capacity -
                            (trip.booked || 0)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>Driver:</strong>{" "}
                          {trip.driver}
                        </p>

                        <p>
                          <strong>Contact:</strong>{" "}
                          {trip.contact}
                        </p>

                        <p>
                          <strong>Start:</strong>{" "}
                          {trip.startTime
                            ? new Date(
                                trip.startTime
                              ).toLocaleString()
                            : "N/A"}
                        </p>

                        <p>
                          <strong>End:</strong>{" "}
                          {trip.endTime
                            ? new Date(
                                trip.endTime
                              ).toLocaleString()
                            : "N/A"}
                        </p>

                        <p>
                          <strong>Status:</strong>{" "}
                          {trip.status}
                        </p>

                        <p>
                          <strong>Availability:</strong>{" "}
                          {trip.availability === "available"
                            ? "Available for Service"
                            : "Not Available"}
                        </p>
                      </>
                    )}

                    {trip.location && trip.location.lat && (
                      <LiveMap location={trip.location} destinationText={`Driver: ${trip.driver}`} />
                    )}

                    <div className="trip-footer">
                      <div className="trip-price">{trip.price ? `VUV ${Number(trip.price).toLocaleString()}` : 'Price N/A'}</div>
                      <button onClick={() => bookTrip(trip.id)} className="book-btn">
                        Book {trip.type === "bus" ? "Trip" : "Service"}
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}