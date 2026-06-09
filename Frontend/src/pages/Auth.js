import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";
import logo1 from "../images/logo2.png";

export default function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Passenger",
    contact: "",
  });

  const navigate = useNavigate();
  const BASE_URL = "http://localhost:5001";

  const submit = async () => {
    setError("");

    if (isLogin) {

      // LOGIN VALIDATION
      if (!form.username || !form.password) {
        setError("Please enter username and password");
        return;
      }
    } else {
      // Multi-step signup: if first step, validate basic fields then advance
      if (signupStep === 1) {
        if (!form.username || !form.email) {
          setError("Please enter username and email to continue");
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          setError("Please enter a valid email address");
          return;
        }
        // advance to step 2
        setSignupStep(2);
        return;
      }

      // Final signup validations (step 2)
      if (!form.password || !form.confirmPassword) {
        setError("Please fill password fields");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      // Driver email validation - must end with @driver.vu
      if (form.role === "Driver" && !form.email.endsWith("@driver.vu")) {
        setError("Driver email must end with @driver.vu");
        return;
      }
    }

    try {
      const url = isLogin ? "/login" : "/signup";

      let payload;
      if (isLogin) {
        payload = {
          username: form.username,
          password: form.password,
        };
      } else {
        payload = {
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          contact: form.contact,
        };
      }

      const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Request failed");
        return;
      }

      // Store user data
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("user", JSON.stringify(data.user));

      const role = data.user.role;

      // ROLE-BASED NAVIGATION
      if (role === "Driver") {
        navigate("/driver", { replace: true });
      } else if (role === "Admin") {
        navigate("/admin", { replace: true });
      } else if (role === "Passenger") {
        navigate("/passenger", { replace: true });
      } else {
        navigate("/", { replace: true });
      }

    } catch (err) {
      console.error(err);
      setError("Network error: " + err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* FIXED LOGO */}
        <div className="logo1-container">
          <img src={logo1} alt="App Logo" className="logo1"/>
        </div>
        <h1 className="auth-welcome">Vanuatu Smart Transport</h1>
        <h2>{isLogin ? "Login to your Account" : "Signup"}</h2>

        {error && <p className="auth-error">{error}</p>}

        {/* LOGIN FORM */}
        {isLogin ? (
          <>
            <div className="input-group">
              <input
                className="input-field"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
              <span className="input-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zM4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6v1H4v-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>

            <div className="input-group">
              <input
                className="input-field"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <span className="input-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <button type="button" className="input-action" onClick={() => setShowPassword(p => !p)} aria-label="Toggle password visibility">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button type="button" className="btn-primary" onClick={submit}>
              Login
            </button>
          </>
        ) : (
          /* SIGNUP MULTI-STEP */
          <>
            {signupStep === 1 ? (
              <>
                <div className="input-group">
                  <input
                    className="input-field"
                    placeholder="Username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zM4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6v1H4v-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>

                <div className="input-group">
                  <input
                    className="input-field"
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 8v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>

                <div className="input-group">
                  <input
                    className="input-field"
                    placeholder="Contact Number"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  />
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5 2h3a2 2 0 0 1 2 1.72c.12 1.05.37 2.07.73 3.03a2 2 0 0 1-.45 2.11L9.91 10.91a16 16 0 0 0 6 6l1.05-1.05a2 2 0 0 1 2.11-.45c.96.36 1.98.61 3.03.73A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>

                <button type="button" className="btn-primary" onClick={submit}>
                  Next
                </button>
              </>
            ) : (
              <>
                <div className="input-group">
                  <input
                    className="input-field"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <button type="button" className="input-action" onClick={() => setShowPassword(p => !p)} aria-label="Toggle password visibility">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className="input-group">
                  <input
                    className="input-field"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <button type="button" className="input-action" onClick={() => setShowConfirm(p => !p)} aria-label="Toggle confirm password visibility">
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>

                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Passenger">Passenger</option>
                  <option value="Driver">Driver</option>
                  <option value="Admin">Admin</option>
                </select>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setSignupStep(1);
                      setError("");
                    }}
                  >
                    Back
                  </button>

                  <button type="button" className="btn-primary" onClick={submit}>
                    Signup
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <p
          className="auth-switch"
          onClick={() => {
            setIsLogin(!isLogin);
            setSignupStep(1);
            setError("");
            setForm({
              username: "",
              email: "",
              password: "",
              confirmPassword: "",
              role: "Passenger",
              contact: "",
              fullName: ""
            });
          }}
        >
          Switch to {isLogin ? "Signup" : "Login"}
        </p>

      </div>
    </div>
  );
}