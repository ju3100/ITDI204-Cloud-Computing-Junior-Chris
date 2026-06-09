import { useEffect, useState } from "react";
import { getAllData } from "../utils/indexDB";
import AdminChart from "../components/AdminChart";
import { api } from "../api/APIBook";
import { FiMenu, FiX, FiRefreshCw, FiDownload, FiUsers, FiMap, FiClipboard } from "react-icons/fi";
import "../styles/admin.css";

export default function Admin() {

  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("stats");
  const [usersQuery, setUsersQuery] = useState("");
  const [tripsQuery, setTripsQuery] = useState("");
  const [bookingsQuery, setBookingsQuery] = useState("");

  const [newTrip, setNewTrip] = useState({
    type: "bus",
    from: "",
    to: "",
    time: "",
    startTime: "",
    endTime: "",
    capacity: 12,
    busSize: "Mini Bus",
    vehicleType: "Standard Taxi",
    availability: "available",
    driver: "",
    contact: "",
    email: ""
  });

  // LOAD ADMIN DATA
  const loadAdminData = () => {

    fetch("http://localhost:5001/admin/data")

      .then(async (res) => {

        if (!res.ok) {
          throw new Error("Server error");
        }

        return res.json();
      })

      .then((data) => {

        setUsers(data.users || []);
        setTrips(data.trips || []);
        setBookings(data.bookings || []);
      })

      .catch(() => {

        setError("Failed to load admin data");

        getAllData("bookings")
          .then((data) => {
            setBookings(Array.isArray(data) ? data : []);
          })
          .catch(() => {});
      });
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // KPI totals
  const totalRevenue = (bookings || []).reduce((s, b) => s + Number(b.price || 0), 0);

  // Export bookings as CSV
  const exportBookingsCSV = () => {
    const rows = [
      ["id", "tripId", "user", "date", "price", "status"],
      ...bookings.map((b) => [
        b.id,
        b.tripId,
        b.user || b.passenger || "",
        b.date || "",
        b.price || "",
        b.status || ""
      ])
    ];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportUsersCSV = () => {
    const rows = [
      ["id", "username", "email", "role"],
      ...users.map((u) => [u.id, u.username || "", u.email || "", u.role || ""])
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportTripsCSV = () => {
    const rows = [
      ["id", "type", "from", "to", "status"],
      ...trips.map((t) => [t.id, t.type || "", t.from || "", t.to || "", t.status || ""])
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trips_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // FILTER USERS
  const driverUsers = users.filter(
    (u) => u.role === "Driver"
  );

  const passengerUsers = users.filter(
    (u) => u.role === "Passenger"
  );

  // CONFIRM BOOKING
  const confirmBooking = async (id) => {

    try {

      await api.updateBooking(id, {
        status: "confirmed"
      });

      loadAdminData();

    } catch {

      setError("Could not confirm booking");
    }
  };

  // DELETE TRIP
  const deleteTrip = async (id) => {

    try {

      await api.deleteTrip(id);

      loadAdminData();

    } catch {

      setError("Could not delete trip");
    }
  };

  // DELETE BOOKING
  const deleteBooking = async (id) => {

    try {

      await api.deleteBooking(id);

      loadAdminData();

    } catch {

      setError("Could not delete booking");
    }
  };

  // CREATE NEW TRIP
  const saveNewTrip = async () => {

    try {

      await api.createTrip({

        ...newTrip,

        capacity:
          newTrip.type === "bus"
            ? Number(newTrip.capacity)
            : 1,

        booked: 0,

        status:
          newTrip.type === "bus"
            ? "scheduled"
            : "active"
      });

      setNewTrip({
        type: "bus",
        from: "",
        to: "",
        time: "",
        startTime: "",
        endTime: "",
        capacity: 12,
        busSize: "Mini Bus",
        vehicleType: "Standard Taxi",
        availability: "available",
        driver: "",
        contact: "",
        email: ""
      });

      loadAdminData();

    } catch {

      setError("Could not add trip");
    }
  };

  return (

    <div className="admin-container">

      {/* HEADER */}
      <div className="role-header">


        <div className="admin-actions">
          <button
            className="icon-btn"
            title="Refresh data"
            onClick={() => loadAdminData()}
          >
            <FiRefreshCw />
          </button>

          <button
            className="icon-btn"
            title="Export bookings CSV"
            onClick={exportBookingsCSV}
          >
            <FiDownload />
          </button>

          <button
            className="menu-toggle"
            onClick={() =>
              setMenuOpen((prev) => !prev)
            }
            aria-label="Toggle admin menu"
          >
            {menuOpen
              ? <FiX size={20} />
              : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* MENU */}
      {menuOpen && (

        <div className="role-menu">

          <button
            className={
              activeSection === "stats"
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveSection("stats");
              setMenuOpen(false);
            }}
          >
            Stats
          </button>

          <button
            className={
              activeSection === "users"
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveSection("users");
              setMenuOpen(false);
            }}
          >
            Users
          </button>

          <button
            className={
              activeSection === "trips"
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveSection("trips");
              setMenuOpen(false);
            }}
          >
            Trips
          </button>

          <button
            className={
              activeSection === "bookings"
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveSection("bookings");
              setMenuOpen(false);
            }}
          >
            Bookings
          </button>

          <button
            className={
              activeSection === "add"
                ? "active"
                : ""
            }
            onClick={() => {
              setActiveSection("add");
              setMenuOpen(false);
            }}
          >
            Add Trip
          </button>

        </div>
      )}

      {/* ERROR */}
      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {/* STATS */}
      {activeSection === "stats" && (
        <>

          <div className="admin-stats">

              <div className="stat-card">
                <div className="stat-left">
                  <div className="stat-head">
                    <FiUsers className="stat-icon" />
                    <h3>Users</h3>
                  </div>
                  <small className="stat-delta">{users.length > 0 ? `+${Math.round((users.length/10)||0)}%` : "—"} since last week</small>
                </div>
                <div className="stat-right">
                  <p className="stat-number">{users.length}</p>
                </div>
              </div>

            <div className="stat-card">
              <div className="stat-left">
                <div className="stat-head">
                  <FiMap className="stat-icon" />
                  <h3>Trips</h3>
                </div>
                <small className="stat-delta">{trips.length > 0 ? `+${Math.round((trips.length/10)||0)}%` : "—"} scheduled</small>
              </div>
              <div className="stat-right">
                <p className="stat-number">{trips.length}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-left">
                <div className="stat-head">
                  <FiClipboard className="stat-icon" />
                  <h3>Bookings</h3>
                </div>
                <small className="stat-delta">Revenue: {totalRevenue.toLocaleString()} VUV</small>
              </div>
              <div className="stat-right">
                <p className="stat-number">{bookings.length}</p>
              </div>
            </div>

          </div>

          <div className="chart-container">
            <AdminChart
              bookings={bookings}
              trips={trips}
            />
          </div>

        </>
      )}

      {/* USERS */}
      {activeSection === "users" && (

          <div className="table-section">

          <div className="table-controls">
            <h3 style={{ margin: 0 }}>Drivers</h3>
            <div>
              <input className="search-input" placeholder="Search drivers" value={usersQuery} onChange={e => setUsersQuery(e.target.value)} />
              <button className="icon-btn" title="Export drivers CSV" onClick={exportUsersCSV}>CSV</button>
            </div>
          </div>

          {driverUsers.filter(u => u.username?.toLowerCase().includes(usersQuery.toLowerCase())).length === 0 ? (
            <p>No drivers found</p>
          ) : (

            <table>

              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                </tr>
              </thead>

              <tbody>

                {driverUsers.filter(u => u.username?.toLowerCase().includes(usersQuery.toLowerCase())).map((u) => (

                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                  </tr>

                ))}

              </tbody>

            </table>
          )}

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Passengers</h3>
            <div>
              <input className="search-input" placeholder="Search passengers" value={usersQuery} onChange={e => setUsersQuery(e.target.value)} />
            </div>
          </div>

          {passengerUsers.filter(u => u.username?.toLowerCase().includes(usersQuery.toLowerCase())).length === 0 ? (
            <p>No passengers found</p>
          ) : (

            <table>

              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                </tr>
              </thead>

              <tbody>

                {passengerUsers.filter(u => u.username?.toLowerCase().includes(usersQuery.toLowerCase())).map((u) => (

                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                  </tr>

                ))}

              </tbody>

            </table>
          )}

        </div>
      )}

      {/* TRIPS */}
      {activeSection === "trips" && (

          <div className="table-section">

          <div className="table-controls">
            <h3 style={{ margin: 0 }}>Trips</h3>
            <div>
              <input className="search-input" placeholder="Search trips (type/from/to)" value={tripsQuery} onChange={e => setTripsQuery(e.target.value)} />
              <button className="icon-btn" title="Export trips CSV" onClick={exportTripsCSV}>CSV</button>
            </div>
          </div>

          {trips.filter(t => (`${t.type} ${t.from || ''} ${t.to || ''}`).toLowerCase().includes(tripsQuery.toLowerCase())).length === 0 ? (
            <p>No trips available</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Time / Window</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.filter(t => (`${t.type} ${t.from || ''} ${t.to || ''}`).toLowerCase().includes(tripsQuery.toLowerCase())).map((t) => (
                  <tr key={t.id}>
                    <td>{t.type}</td>
                    <td>{t.from || "—"}</td>
                    <td>{t.to || "—"}</td>
                    <td>
                      {t.type === "bus"
                        ? (
                          t.time ? new Date(t.time).toLocaleString() : "N/A"
                        ) : (
                          t.startTime && t.endTime
                            ? `${new Date(t.startTime).toLocaleString()} → ${new Date(t.endTime).toLocaleString()}`
                            : "N/A"
                        )}
                    </td>
                    <td>{t.status || "N/A"}</td>
                    <td>
                      <button className="delete" onClick={() => deleteTrip(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      )}

      {/* BOOKINGS */}
      {activeSection === "bookings" && (

          <div className="table-section">

          <div className="table-controls">
            <h3 style={{ margin: 0 }}>Bookings</h3>
            <div>
              <input className="search-input" placeholder="Search bookings (user/trip id)" value={bookingsQuery} onChange={e => setBookingsQuery(e.target.value)} />
              <button className="icon-btn" title="Export bookings CSV" onClick={exportBookingsCSV}>CSV</button>
            </div>
          </div>

          {bookings.filter(b => (`${b.user || b.passenger || ''} ${b.tripId || ''}`).toLowerCase().includes(bookingsQuery.toLowerCase())).length === 0 ? (
            <p>No bookings found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.filter(b => (`${b.user || b.passenger || ''} ${b.tripId || ''}`).toLowerCase().includes(bookingsQuery.toLowerCase())).map((b) => (
                  <tr key={b.id}>
                    <td>{b.tripId}</td>
                    <td>{b.user || b.passenger || "N/A"}</td>
                    <td>{b.status}</td>
                    <td>
                      {b.status !== "confirmed" && (
                        <button onClick={() => confirmBooking(b.id)}>Confirm</button>
                      )}
                      <button className="delete" onClick={() => deleteBooking(b.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      )}

      {/* ADD TRIP */}
      {activeSection === "add" && (

        <div className="table-section">

          <h3>Add Trip</h3>

          <div className="admin-form">

            <label>Type</label>

            <select
              value={newTrip.type}
              onChange={(e) =>
                setNewTrip({
                  ...newTrip,
                  type: e.target.value
                })
              }
            >
              <option value="bus">Bus</option>
              <option value="taxi">Taxi</option>
              <option value="private">Private</option>
            </select>

            {newTrip.type === "bus" ? (
              <>

                <label>From</label>

                <input
                  value={newTrip.from}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      from: e.target.value
                    })
                  }
                />

                <label>To</label>

                <input
                  value={newTrip.to}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      to: e.target.value
                    })
                  }
                />

                <label>Time</label>

                <input
                  type="datetime-local"
                  value={newTrip.time}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      time: e.target.value
                    })
                  }
                />

                <label>Capacity</label>

                <input
                  type="number"
                  min="1"
                  value={newTrip.capacity}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      capacity: Number(e.target.value)
                    })
                  }
                />

              </>
            ) : (
              <>

                <label>Availability</label>

                <select
                  value={newTrip.availability}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      availability: e.target.value
                    })
                  }
                >
                  <option value="available">
                    Available for Service
                  </option>

                  <option value="not_available">
                    Not Available
                  </option>
                </select>

                <label>Start Time</label>

                <input
                  type="datetime-local"
                  value={newTrip.startTime}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      startTime: e.target.value
                    })
                  }
                />

                <label>End Time</label>

                <input
                  type="datetime-local"
                  value={newTrip.endTime}
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      endTime: e.target.value
                    })
                  }
                />

              </>
            )}

            <label>Driver Username</label>

            <input
              value={newTrip.driver}
              onChange={(e) =>
                setNewTrip({
                  ...newTrip,
                  driver: e.target.value
                })
              }
            />

            <label>Contact</label>

            <input
              value={newTrip.contact}
              onChange={(e) =>
                setNewTrip({
                  ...newTrip,
                  contact: e.target.value
                })
              }
            />

            <label>Email</label>

            <input
              value={newTrip.email}
              onChange={(e) =>
                setNewTrip({
                  ...newTrip,
                  email: e.target.value
                })
              }
            />

            <button onClick={saveNewTrip}>
              Create Trip
            </button>

          </div>

        </div>
      )}

    </div>
  );
}