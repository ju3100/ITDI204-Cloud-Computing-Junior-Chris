require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const ROLES = ["Passenger", "Driver", "Admin"];

// ================= DATABASE =================
// Use a single Pool instance; enable SSL (rejectUnauthorized false) for hosted DBs if provided
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch(err => console.error("Database connection error:", err));

// Global error handlers to surface crashes in platform logs
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Exit so the platform (Render) restarts the instance and surfaces the crash cause
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ================= EXPRESS =================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://project-assesment-204.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// ================= AUTH =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const user = req.body;

    if (!user.username || !user.email || !user.password || !user.role) {
      return res.status(400).json({
        message: "All required fields must be provided"
      });
    }

    if (!ROLES.includes(user.role)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(user.email)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    if (
      user.role === "Driver" &&
      !user.email.endsWith("@driver.vu")
    ) {
      return res.status(400).json({
        message: "Driver email must end with @driver.vu"
      });
    }

    if (user.password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await pool.query(
      `
      SELECT *
      FROM users
      WHERE username = $1 OR email = $2
      `,
      [user.username, user.email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Username or email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (username, email, password_hash, role, contact)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, contact
      `,
      [
        user.username,
        user.email,
        hashedPassword,
        user.role,
        user.contact || null
      ]
    );

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        message: "Invalid username or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid username or password"
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        contact: user.contact
      }
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// ================= TRIPS =================

// CREATE TRIP
app.post("/trips", async (req, res) => {
  try {

    const capacity = Math.max(
      0,
      Number(req.body.capacity) || 0
    );

    let driver_id = null;

    if (req.body.driver) {

      const userRes = await pool.query(
        `SELECT id FROM users WHERE username = $1`,
        [req.body.driver]
      );

      if (userRes.rows.length > 0) {
        driver_id = userRes.rows[0].id;
      } else {
        return res.status(400).json({
          success: false,
          message: "Driver not found"
        });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO trips (
        type,
        driver_id,
        pickup_location,
        destination_location,
        trip_time,
        start_time,
        end_time,
        capacity,
        booked,
        status,
        bus_size,
        vehicle_type,
        availability,
        contact,
        email,
        location
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16
      )
      RETURNING
        id,
        type,
        driver_id,
        pickup_location as "from",
        destination_location as "to",
        trip_time as time,
        start_time as "startTime",
        end_time as "endTime",
        capacity,
        booked,
        status,
        bus_size as "busSize",
        vehicle_type as "vehicleType",
        availability,
        contact,
        email,
        location
      `,
      [
        req.body.type || null,
        driver_id,
        req.body.from || "N/A",
        req.body.to || "N/A",
        req.body.time || null,
        req.body.startTime || null,
        req.body.endTime || null,
        capacity,
        0,
        req.body.status || "scheduled",
        req.body.busSize || null,
        req.body.vehicleType || null,
        req.body.availability || null,
        req.body.contact || null,
        req.body.email || null,
        req.body.location || null
      ]
    );

    const trip = result.rows[0];

    trip.driver = req.body.driver;

    res.json({
      success: true,
      trip
    });

  } catch (err) {

    console.error("CREATE TRIP ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error: " + err.message
    });
  }
});

// GET TRIPS
app.get("/trips", async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.type,
        u.username as driver,
        t.pickup_location as "from",
        t.destination_location as "to",
        t.trip_time as time,
        t.start_time as "startTime",
        t.end_time as "endTime",
        t.capacity,
        t.booked,
        t.status,
        t.bus_size as "busSize",
        t.vehicle_type as "vehicleType",
        t.availability,
        t.contact,
        t.email,
        t.location
      FROM trips t
      LEFT JOIN users u
      ON t.driver_id = u.id
      ORDER BY t.id DESC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error("GET TRIPS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// UPDATE TRIP
app.put("/trips/:id", async (req, res) => {
  try {

    const id = req.params.id;

    const result = await pool.query(
      `
      UPDATE trips
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [req.body.status, id]
    );

    res.json({
      success: true,
      trip: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// DELETE TRIP
app.delete("/trips/:id", async (req, res) => {
  try {

    await pool.query(
      `DELETE FROM trips WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// ================= BOOKINGS =================

// CREATE BOOKING
app.post("/bookings", async (req, res) => {
  try {

    let trip = null;

    if (req.body.tripId) {

      const tripResult = await pool.query(
        `SELECT * FROM trips WHERE id = $1`,
        [req.body.tripId]
      );

      trip = tripResult.rows[0];

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found"
        });
      }
    }

    const passengers = Number(req.body.passengers) || 1;

    if (
      trip &&
      trip.capacity &&
      trip.booked + passengers > trip.capacity
    ) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available"
      });
    }

    let user_id = null;

    if (req.body.user) {

      const userRes = await pool.query(
        `
        SELECT id
        FROM users
        WHERE username = $1 OR email = $1
        `,
        [req.body.user]
      );

      if (userRes.rows.length > 0) {
        user_id = userRes.rows[0].id;
      }
    }

    // If the bookings.user_id column is required in the DB schema, ensure we have a valid user
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "A valid user must be provided for booking"
      });
    }

    let vehicleInfo = req.body.vehicle;

    if (!vehicleInfo && trip) {
      vehicleInfo =
        trip.vehicle_type ||
        trip.bus_size ||
        trip.type;
    }

    const bookingResult = await pool.query(
      `
      INSERT INTO bookings (
        trip_id,
        user_id,
        vehicle,
        price,
        passengers,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING
        id,
        trip_id as "tripId",
        user_id,
        vehicle,
        price,
        passengers,
        status
      `,
      [
        req.body.tripId || null,
        user_id,
        vehicleInfo || null,
        req.body.price || null,
        passengers,
        req.body.status || "pending"
      ]
    );

    if (trip) {

      await pool.query(
        `
        UPDATE trips
        SET booked = booked + $1
        WHERE id = $2
        `,
        [passengers, req.body.tripId]
      );
    }

    const newBooking = bookingResult.rows[0];

    newBooking.user = req.body.user;

    res.json({
      success: true,
      booking: newBooking
    });

  } catch (err) {

    console.error("CREATE BOOKING ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// GET BOOKINGS
app.get("/bookings", async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.trip_id as "tripId",
        u.username as user,
        b.vehicle,
        b.price,
        b.passengers,
        b.status
      FROM bookings b
      LEFT JOIN users u
      ON b.user_id = u.id
      ORDER BY b.id DESC
      `
    );

    res.json(result.rows);

  } catch (err) {

    console.error("GET BOOKINGS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// DELETE BOOKING
app.delete("/bookings/:id", async (req, res) => {
  try {

    await pool.query(
      `DELETE FROM bookings WHERE id = $1`,
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// ================= ADMIN =================

app.get("/admin/data", async (req, res) => {
  try {

    const users = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        role,
        contact
      FROM users
      `
    );

    const trips = await pool.query(
      `SELECT * FROM trips`
    );

    const bookings = await pool.query(
      `SELECT * FROM bookings`
    );

    res.json({
      users: users.rows,
      trips: trips.rows,
      bookings: bookings.rows
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

// ================= SOCKET.IO =================

io.on("connection", (socket) => {

  console.log("New client connected", socket.id);

  socket.on("driverLocationUpdate", async (data) => {

    try {

      const { tripId, location } = data;

      await pool.query(
        `
        UPDATE trips
        SET location = $1
        WHERE id = $2
        `,
        [location, tripId]
      );

      io.emit("tripLocationUpdated", {
        tripId,
        location
      });

    } catch (err) {

      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

// ================= SERVER =================

// Health check
app.get('/', (req, res) => res.send({ status: 'ok' }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});