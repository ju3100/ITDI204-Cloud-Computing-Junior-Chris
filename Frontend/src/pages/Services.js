import { useNavigate } from "react-router-dom";
import taxiImg from "../images/Taxi.jpg";
import busImg from "../images/bus.jpg";
import hireImg from "../images/camion.jpg";
import "../styles/service.css";


export default function Services() {
  const navigate = useNavigate();

  const services = [
    { name: "Taxi", path: "/services/taxi", img: taxiImg },
    { name: "Bus", path: "/services/bus", img: busImg },
    { name: "Private Hire", path: "/services/private", img: hireImg },
  ];

  return (
    <div className="services-page">
      <h1>All Transport Services</h1>

      <div className="service-grid">
        {services.map((s, i) => (
          <div className="service-card" key={i}>
  <img src={s.img} alt={s.name} /> {/* Image at the top behaves better in flex columns */}
  <h3>{s.name}</h3>
  <button onClick={() => navigate(s.path)}>
    View Service
  </button>
</div>
        ))}
      </div>
    </div>
  );
}