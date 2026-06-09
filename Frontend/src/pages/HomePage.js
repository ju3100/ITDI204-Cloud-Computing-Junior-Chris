import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import busImg from "../images/bus.jpg";
import hireImg from "../images/Private-Hire.jpg";
import taxiImg from "../images/Taxi.jpg";

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const services = [
    { name: "Taxi", img: taxiImg, price: 1200, desc: "Fast local taxi service" },
    { name: "Bus", img: busImg, price: 200, desc: "Scheduled bus routes across islands" },
    { name: "Private Hire", img: hireImg, price: 3500, desc: "Private hire for groups and events" },
  ];

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  // Animated counters
  const [counters, setCounters] = useState({ trips: 0, drivers: 0, bookings: 0 });

  useEffect(() => {
    let raf;
    const start = Date.now();
    const duration = 1200;
    const target = { trips: 1280, drivers: 86, bookings: 432 };

    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setCounters({
        trips: Math.floor(target.trips * t),
        drivers: Math.floor(target.drivers * t),
        bookings: Math.floor(target.bookings * t),
      });

      if (t < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Search suggestions
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestions = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  // testimonials
  const testimonials = [
    { name: "M. Samson", text: "Quick pickup and friendly drivers — highly recommend." },
    { name: "T. Ariti", text: "Saved me time commuting between islands. Reliable service." },
    { name: "P. Kalo", text: "Great value for buses and private hires." },
  ];
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const servicesRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setCurrentTestimonial((p) => (p + 1) % testimonials.length), 4200);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const scrollToServices = () => {
    if (servicesRef.current) servicesRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const getTypeKey = (name) => {
    const n = name.toLowerCase();
    if (n.includes("taxi")) return "taxi";
    if (n.includes("bus")) return "bus";
    if (n.includes("private")) return "private";
    return n.replace(/\s+/g, "-");
  };

  return (
    <div className="home">
      {/* HERO */}
      <div className="hero-image" style={{ backgroundImage: `url(${busImg})` }}>
        <div className="hero-content">
          <h1>Book Transport Easily</h1>
          <p>Fast • Reliable • Anywhere in Vanuatu</p>

          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => navigate("/passenger")}>Passenger Panel</button>
            <button className="btn-ghost" onClick={scrollToServices}>Explore Services</button>
          </div>

          <div className="hero-counters">
            <div className="counter">
              <div className="counter-value">{counters.trips}</div>
              <div className="counter-label">Trips Served</div>
            </div>

            <div className="counter">
              <div className="counter-value">{counters.drivers}</div>
              <div className="counter-label">Drivers</div>
            </div>

            <div className="counter">
              <div className="counter-value">{counters.bookings}</div>
              <div className="counter-label">Bookings</div>
            </div>
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <section className="about">
        <h2>About</h2>
        <p>
          Vanuatu Smart Transport is a smart transport booking system that helps users in Vanuatu
          easily find and book taxis, buses, and public transport. Our platform is designed to make
          travel simple, fast, and reliable—all in one place.
        </p>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="testimonial-card">
          <p className="testimonial-text">“{testimonials[currentTestimonial].text}”</p>
          <div className="testimonial-author">— {testimonials[currentTestimonial].name}</div>
        </div>
      </section>

      {/* SERVICES */}
      <section ref={servicesRef} className="services">
        <h3>Our Services</h3>

        {/* SEARCH */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search transport..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSuggestionsOpen(Boolean(e.target.value));
            }}
            onFocus={() => setSuggestionsOpen(Boolean(search))}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 160)}
          />
        </div>

        {suggestionsOpen && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion"
                onMouseDown={() => {
                  setSearch(s.name);
                  setSuggestionsOpen(false);
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="service-grid">
          {filtered.map((s, i) => (
            <div className="service-card" key={i}>
              <h3>{s.name}</h3>
              <img src={s.img} alt={s.name} />

              <div className="service-info">
                <div className="service-desc">{s.desc}</div>
                <div className="service-price">VUV {Number(s.price).toLocaleString()}</div>
              </div>

              <div className="action-buttons">
                <div className="book-now">
                  <button onClick={() => {
                    const key = getTypeKey(s.name);
                    navigate(`/services/${key}?book=1`);
                  }}>
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} TransportVU</p>
        <p>Smart Transport for Vanuatu</p>
      </footer>
    </div>
  );
}
