import { useState, useMemo } from "react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import "../styles/adminChart.css";

export default function AdminChart({
  bookings = [],
  trips = []
}) {

  const [filter, setFilter] = useState("all");

  // COMBINE BOOKINGS WITH TRIP TYPE
  const bookingsWithType = useMemo(() => {

    return bookings.map((b) => {

      const trip = Array.isArray(trips)

        ? trips.find(
            (t) =>
              String(t.id) === String(b.tripId)
          )

        : null;

      const rawDate =
        trip?.time ||
        trip?.startTime ||
        b.date ||
        Date.now();

      return {

        ...b,

        type: trip?.type || "unknown",

        date: new Date(rawDate)
          .toISOString()
          .split("T")[0]
      };
    });

  }, [bookings, trips]);

  // FILTER BOOKINGS
  const filteredBookings = useMemo(() => {

    if (filter === "all") {
      return bookingsWithType;
    }

    return bookingsWithType.filter(
      (b) => b.type === filter
    );

  }, [bookingsWithType, filter]);

  // BAR CHART DATA
  const types = ["bus", "taxi", "private"];

  const barData = types.map((type) => ({

    name:
      type.charAt(0).toUpperCase() +
      type.slice(1),

    value: filteredBookings.filter(
      (b) => b.type === type
    ).length

  }));

  // LINE CHART DATA
  const lineData = Object.values(

    filteredBookings.reduce((acc, booking) => {

      const date = booking.date || "Unknown";

      if (!acc[date]) {

        acc[date] = {
          date,
          bookings: 0,
          revenue: 0
        };
      }

      acc[date].bookings += 1;
      acc[date].revenue += Number(booking.price || 0);

      return acc;

    }, {})

  ).sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date)
  );

  // TOTAL REVENUE
  const totalRevenue = filteredBookings.reduce(
    (sum, b) => sum + Number(b.price || 0),
    0
  );

  return (

    <div className="chart-card overview">

      <div className="chart-title-row">
        <h3 className="chart-title">System Overview</h3>
        <div className="chart-kpis">
          <div className="kpi">
            <div className="kpi-label">Bookings</div>
            <div className="kpi-value">{filteredBookings.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Revenue</div>
            <div className="kpi-value">{totalRevenue.toLocaleString()} VUV</div>
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className="chart-filter">

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
        >
          <option value="all">
            All Services
          </option>

          <option value="bus">
            Bus
          </option>

          <option value="taxi">
            Taxi
          </option>

          <option value="private">
            Private
          </option>

        </select>

      </div>

      {/* SUMMARY */}
      <div className="chart-summary">

        <p>
          Total Bookings: {" "}{filteredBookings.length}
        </p>

        <p>
          Total Revenue: {" "}{totalRevenue.toLocaleString()} VUV
        </p>

      </div>

      {/* EMPTY STATE */}
      {filteredBookings.length === 0 ? (

        <p className="empty-chart">
          No booking data available
        </p>

      ) : (

        <>

          {/* BAR CHART */}
          <h4>Bookings by Service</h4>

          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="#9ca3af" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(8,12,20,0.95)', border: '1px solid rgba(255,255,255,0.04)', color: '#e6eef8' }}
                formatter={(value, name) => [value, name]}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 4, 4]} fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>

          {/* LINE CHART */}
          <h4 style={{ marginTop: "16px" }}>Booking Trends</h4>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bookingsGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis yAxisId="left" allowDecimals={false} stroke="#9ca3af" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v} stroke="#9ca3af" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'rgba(8,12,20,0.95)', border: '1px solid rgba(255,255,255,0.04)', color: '#e6eef8' }} formatter={(value, name) => [name === 'revenue' ? Number(value).toLocaleString() + ' VUV' : value, name]} />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#34d399" fill="url(#revenueGradient)" name="Revenue (VUV)" />
              <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#60a5fa" activeDot={{ r: 4 }} strokeWidth={2} name="Bookings" />
            </LineChart>
          </ResponsiveContainer>

        </>
      )}

    </div>
  );
}