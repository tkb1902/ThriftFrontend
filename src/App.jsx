import { useEffect, useMemo, useState } from "react";

const emptySummary = {
  total_donations: 0,
  total_inventory_in_stock: 0,
  total_inventory_sold: 0,
  total_sales_value: "0.00",
  total_volunteer_minutes: 0
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("mf_token") || "");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [summary, setSummary] = useState(emptySummary);
  const [status, setStatus] = useState("Ready");

  const authHeader = useMemo(() => ({
    Authorization: token ? `Bearer ${token}` : ""
  }), [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("mf_token", token);
    } else {
      localStorage.removeItem("mf_token");
    }
  }, [token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus("Signing in...");
    const body = new URLSearchParams();
    body.set("username", login.username);
    body.set("password", login.password);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      setStatus("Login failed.");
      return;
    }

    const data = await response.json();
    setToken(data.access_token);
    setStatus("Signed in.");
  };

  const loadDashboard = async () => {
    if (!token) {
      setStatus("Add a token to load the dashboard.");
      return;
    }
    setStatus("Loading dashboard...");
    const response = await fetch("/api/reporting/dashboard", {
      headers: authHeader
    });

    if (!response.ok) {
      setStatus("Failed to load dashboard.");
      return;
    }

    const data = await response.json();
    setSummary(data);
    setStatus("Dashboard updated.");
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">MissionFlow Thrift ERP</p>
          <h1>Operational Core Dashboard</h1>
          <p className="subtitle">
            Track the volunteer-to-sale pipeline with real-time ERP signals.
          </p>
        </div>
        <div className="status">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
      </header>

      <section className="panel">
        <form className="login" onSubmit={handleLogin}>
          <div>
            <label>Username</label>
            <input
              value={login.username}
              onChange={(event) =>
                setLogin((prev) => ({ ...prev, username: event.target.value }))
              }
              placeholder="manager"
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={login.password}
              onChange={(event) =>
                setLogin((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          <button type="submit">Sign In</button>
        </form>

        <div className="token">
          <label>JWT Token</label>
          <textarea
            rows="3"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste token from /api/auth/login"
          />
          <button type="button" onClick={loadDashboard}>
            Load Dashboard
          </button>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h3>Total Donations</h3>
          <p>{summary.total_donations}</p>
        </div>
        <div className="card">
          <h3>Inventory In Stock</h3>
          <p>{summary.total_inventory_in_stock}</p>
        </div>
        <div className="card">
          <h3>Inventory Sold</h3>
          <p>{summary.total_inventory_sold}</p>
        </div>
        <div className="card">
          <h3>Total Sales</h3>
          <p>${summary.total_sales_value}</p>
        </div>
        <div className="card">
          <h3>Volunteer Minutes</h3>
          <p>{summary.total_volunteer_minutes}</p>
        </div>
      </section>
    </div>
  );
}
