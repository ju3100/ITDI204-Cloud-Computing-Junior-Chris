import { useState, useEffect, useMemo } from "react";
import "../styles/Bookings.css";

// Default price fallbacks for services (stable across renders)
const DEFAULT_PRICES = {
  bus: 200,
  taxi: 1500,
  private: 1500
};

export default function Booking() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Initialize all properties to prevent controlled-to-uncontrolled input warnings
  const [form, setForm] = useState({
    name: "",
    date: "",
    passengers: 1,
    payment: "cash",
    from: "",
    to: "",
    pickupLocation: "",
    destination: "",
    specialRequests: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    mobileNumber: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Get query params
  const urlParams = new URLSearchParams(window.location.search);
  const filterType = urlParams.get("type");
  const selectedTripId = urlParams.get("tripId");

  // Open booking form cleanly mapped with fallback parameters
  const openBooking = (trip) => {
    setSelectedTrip(trip);
    if (trip.type === "bus") {
      setForm({
        name: "",
        from: trip.from || "",
        to: trip.to || "",
        date: "",
        passengers: 1,
        payment: "cash",
        pickupLocation: "",
        destination: "",
        specialRequests: "",
        cardNumber: "",
        cardExpiry: "",
        cardCvc: "",
        mobileNumber: ""
      });
    } else {
      setForm({
        name: "",
        from: "",
        to: "",
        date: "",
        passengers: 1,
        payment: "cash",
        pickupLocation: "",
        destination: "",
        specialRequests: "",
        cardNumber: "",
        cardExpiry: "",
        cardCvc: "",
        mobileNumber: ""
      });
    }
  };

  // Load trips
  useEffect(() => {
    fetch("http://localhost:5001/trips")
      .then(res => res.json())
      .then(data => {
        const now = new Date();
        let filtered = data;

        if (filterType) {
          filtered = filtered.filter(t => t.type === filterType);
        }

        filtered = filtered.filter(t => {
          const isFuture = t.type === "bus"
            ? true 
            : (t.endTime ? !isNaN(new Date(t.endTime)) && new Date(t.endTime) > now : false);
          const isAvailableStatus = t.status !== "completed" && t.status !== "cancelled" && t.status !== "Full" && t.status !== "Booked" && t.booked < t.capacity;
          return isFuture && isAvailableStatus;
        });

        setTrips(filtered);

        // Safe conversion check for string vs number IDs
        if (selectedTripId) {
          const tripToOpen = filtered.find(t => String(t.id) === String(selectedTripId));
          if (tripToOpen) {
            openBooking(tripToOpen);
          }
        }
      })
      .catch(() => setError("Failed to load trips"));
  }, [filterType, selectedTripId]);

  // Unit price fallback and total calculation moved above usage
  const unitPrice = useMemo(() => {
    if (!selectedTrip) return 0;
    const p = Number(selectedTrip.price || selectedTrip.fare || 0);
    if (p && p > 0) return p;
    return DEFAULT_PRICES[selectedTrip.type] || 0;
  }, [selectedTrip]);

  const totalPrice = useMemo(() => {
    const qty = Number(form.passengers || 1);
    return unitPrice * qty;
  }, [unitPrice, form.passengers]);

  // Submit booking
  const confirmBooking = async () => {
    if (!form.name || !form.date) {
      return setError("Please fill all required fields");
    }

    if (selectedTrip.type !== "bus" && (!form.pickupLocation || !form.destination)) {
      return setError("Please fill pickup location and destination");
    }

    if (form.payment === "card") {
      const raw = (form.cardNumber || "").replace(/\D/g, "");
      const expiry = (form.cardExpiry || "").replace(/[^0-9]/g, "");
      if (!raw || !expiry || !form.cardCvc) {
        return setError("Please fill all card details");
      }
      if (raw.length < 13 || raw.length > 19) {
        return setError("Please enter a valid card number");
      }
      
      // Luhn verification logic
      const luhn = (num) => {
        let sum = 0;
        let shouldDouble = false;
        for (let i = num.length - 1; i >= 0; i--) {
          let digit = parseInt(num.charAt(i), 10);
          if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
          shouldDouble = !shouldDouble;
        }
        return sum % 10 === 0;
      };

      if (!luhn(raw)) return setError("Invalid card number (failed Luhn check)");
      if (expiry.length !== 4) return setError("Please enter card expiry as MM/YY");
      
      const mm = Number(expiry.slice(0, 2));
      const yy = Number(expiry.slice(2, 4));
      if (mm < 1 || mm > 12) return setError("Invalid card expiry month");
      
      const now = new Date();
      const expYear = 2000 + yy;
      // Set to last millisecond of the target month to prevent mid-month expiration runtime bugs
      const expDate = new Date(expYear, mm, 0, 23, 59, 59, 999);
      if (expDate <= now) return setError("Card has expired");
      if (!/^[0-9]{3,4}$/.test(form.cardCvc)) return setError("Invalid CVC");

    } else if (form.payment === "mobile") {
      const num = (form.mobileNumber || "").replace(/\D/g, "");
      if (!num || num.length < 7) {
        return setError("Please enter a valid Mobile Money number");
      }
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const bookingData = {
        tripId: selectedTrip.id,
        type: selectedTrip.type,
        user: form.name,
        date: form.date,
        passengers: Number(form.passengers),
        payment: form.payment,
        status: "pending",
        unitPrice: unitPrice,
        price: totalPrice
      };

      if (selectedTrip.type === "bus") {
        bookingData.from = form.from;
        bookingData.to = form.to;
      } else {
        bookingData.pickupLocation = form.pickupLocation;
        bookingData.destination = form.destination;
        bookingData.specialRequests = form.specialRequests;
      }

      const res = await fetch("http://localhost:5001/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });

      const data = await res.json();

      if (data.success) {
        if (selectedTrip.type === "bus") {
          setTrips(prevTrips => prevTrips.map(t =>
            t.id === selectedTrip.id
              ? {
                  ...t,
                  booked: (t.booked || 0) + Number(form.passengers),
                  status: data.tripStatus || t.status
                }
              : t
          ));
        } else {
          setTrips(prevTrips => prevTrips.filter(t => t.id !== selectedTrip.id));
        }

        setSuccess(`Booking confirmed! Payment method: ${form.payment}`);
        setSelectedTrip(null);
        setForm({
          name: "", date: "", passengers: 1, payment: "cash",
          from: "", to: "", pickupLocation: "", destination: "", specialRequests: "",
          cardNumber: "", cardExpiry: "", cardCvc: "", mobileNumber: ""
        });
      } else {
        setError(data.message || "Booking failed");
      }

    } catch (err) {
      console.error(err);
      setError("Booking failed");
    }
    setLoading(false);
  };

  // Masked card string for display
  const maskedCard = useMemo(() => {
    const digits = (form.cardNumber || '').replace(/\D/g, '');
    if (!digits) return '';
    const last4 = digits.slice(-4);
    return '•••• •••• •••• ' + last4;
  }, [form.cardNumber]);

  return (
    <div className="booking-container">
      <h2 className="title">
        {filterType ? `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Trips` : "Available Trips"}
      </h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="trip-grid">
        {trips.length === 0 ? (
          <p>No available trips found</p>
        ) : (
          trips.map(trip => (
            <div key={trip.id} className="trip-card">
              <span className="badge">{trip.type}</span>
              {trip.type === "bus" ? (
                <p>{trip.from} → {trip.to}</p>
              ) : (
                <>
                  <p>{trip.status === "active" ? "Taxi/Private available now" : "Service slot available"}</p>
                  <p><strong>Start:</strong> {trip.startTime ? new Date(trip.startTime).toLocaleString() : "N/A"}</p>
                  <p><strong>End:</strong> {trip.endTime ? new Date(trip.endTime).toLocaleString() : "N/A"}</p>
                </>
              )}
              <button className="book-btn" onClick={() => openBooking(trip)}>
                Book Now
              </button>
            </div>
          ))
        )}
      </div>

      {selectedTrip && (
        <div className="modal">
          <div className="modal-box">
            <h3>Booking Form - {selectedTrip.type.toUpperCase()}</h3>
            <p><strong>Driver:</strong> {selectedTrip.driver}</p>
            <p><strong>Contact:</strong> {selectedTrip.contact}</p>

            {selectedTrip.type === "bus" ? (
              <>
                <p><strong>Route:</strong> {selectedTrip.from} → {selectedTrip.to}</p>
                <p><strong>Time:</strong> {new Date(selectedTrip.time).toLocaleString()}</p>
                <p><strong>Available Seats:</strong> {selectedTrip.capacity - (selectedTrip.booked || 0)}</p>
              </>
            ) : (
              <>
                <p><strong>Start:</strong> {selectedTrip.startTime ? new Date(selectedTrip.startTime).toLocaleString() : "N/A"}</p>
                <p><strong>End:</strong> {selectedTrip.endTime ? new Date(selectedTrip.endTime).toLocaleString() : "N/A"}</p>
                <p><strong>Status:</strong> {selectedTrip.status}</p>
              </>
            )}
            
            <div className="price-summary">
              <p><strong>Price per unit:</strong> {unitPrice ? unitPrice.toLocaleString() + ' VUV' : '—'}</p>
              <p><strong>Total:</strong> {unitPrice ? totalPrice.toLocaleString() + ' VUV' : '—'}</p>
            </div>

            <div className="modal-form">
              <input
                placeholder="Passenger Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />

              {selectedTrip.type !== "bus" && (
                <>
                  <input
                    placeholder="Pickup Location"
                    value={form.pickupLocation}
                    onChange={e => setForm({ ...form, pickupLocation: e.target.value })}
                  />
                  <input
                    placeholder="Destination"
                    value={form.destination}
                    onChange={e => setForm({ ...form, destination: e.target.value })}
                  />
                  <textarea
                    placeholder="Special Requests (optional)"
                    value={form.specialRequests}
                    onChange={e => setForm({ ...form, specialRequests: e.target.value })}
                    rows="3"
                  />
                </>
              )}

              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />

              <input
                type="number"
                min="1"
                max={selectedTrip.type === "bus" ? (selectedTrip.capacity - (selectedTrip.booked || 0)) : "4"}
                value={form.passengers}
                onChange={e => setForm({ ...form, passengers: Number(e.target.value) })}
              />

              <div className="payment-block">
                <label htmlFor="booking-payment" className="payment-label">Payment Method</label>
                <select
                  id="booking-payment"
                  value={form.payment}
                  onChange={e => setForm({ ...form, payment: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Money</option>
                </select>
              </div>

              {form.payment === "card" && (
                <>
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={form.cardNumber}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0,19).replace(/(.{4})/g, '$1 ').trim();
                      setForm({ ...form, cardNumber: v });
                    }}
                  />
                  {maskedCard && <div style={{ fontSize: '0.9rem', color: '#475569' }}>Card: {maskedCard}</div>}
                  <div className="two-col">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={form.cardExpiry}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0,4);
                        const out = v.length > 2 ? v.slice(0,2) + '/' + v.slice(2) : v;
                        setForm({ ...form, cardExpiry: out });
                      }}
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      value={form.cardCvc}
                      onChange={e => setForm({ ...form, cardCvc: e.target.value.replace(/\D/g, '').slice(0,4) })}
                    />
                  </div>
                </>
              )}

              {form.payment === "mobile" && (
                <input
                  type="text"
                  placeholder="Mobile Money Number"
                  value={form.mobileNumber}
                  onChange={e => setForm({ ...form, mobileNumber: e.target.value.replace(/\D/g, '').slice(0,15) })}
                />
              )}
            </div>

            <div className="modal-actions">
              <button onClick={confirmBooking} disabled={loading} className="confirm-btn">
                {loading ? "Processing..." : "Confirm Booking"}
              </button>
              <button className="cancel-btn" onClick={() => setSelectedTrip(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}