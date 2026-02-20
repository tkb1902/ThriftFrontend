import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function Donors({ authHeader }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", address: "", notes: "" });
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchDonors();
  }, []);

  async function fetchDonors() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/donors", { headers: authHeader });
      setDonors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load donors");
    }
    setLoading(false);
  }

  async function createDonor(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      };
      const created = await apiFetch("/api/donors", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setDonors((prev) => [created, ...prev]);
      setForm({ full_name: "", phone: "", email: "", address: "", notes: "" });
    } catch (err) {
      setError(err.message || "Failed to create donor");
    }
  }

  async function viewDonor(id) {
    setSelected(null);
    setSummary(null);
    setLoading(true);
    try {
      const data = await apiFetch(`/api/donors/${id}`, { headers: authHeader });
      setSelected(data.donor || data);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || "Failed to load donor");
    }
    setLoading(false);
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Donors</p>
          <h1>Donor Profiles</h1>
          <p className="subtitle">Manage donor records and view donation history.</p>
        </div>
      </header>

      <section style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <form onSubmit={createDonor} style={{ minWidth: 360 }}>
            <label>
              Full name
              <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} required />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </label>
            <label>
              Notes
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
            </label>
            {error ? <div style={{ color: 'red' }}>{error}</div> : null}
            <div style={{ marginTop: 8 }}>
              <button className="primary" type="submit">Create donor</button>
            </div>
          </form>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Donor list</h3>
              <div>{loading ? 'Loading...' : `${donors.length} donors`}</div>
            </div>
            <div className="table">
              <div className="table-head"><span>Name</span><span>Contact</span><span>Actions</span></div>
              {donors.map((d) => (
                <div key={d.id} className="table-row">
                  <div>
                    <strong>{d.full_name}</strong>
                    <p className="helper">{d.email || d.phone}</p>
                  </div>
                  <span>{d.phone || '-'}</span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost small" onClick={() => viewDonor(d.id)}>View</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selected && (
          <div style={{ marginTop: 12 }} className="panel-card">
            <div className="panel-head"><h3>Donor</h3><span>Profile</span></div>
            <div style={{ padding: 12 }}>
              <strong>{selected.full_name}</strong>
              <p>{selected.email || selected.phone}</p>
              <p>{selected.address}</p>
              <p className="helper">{selected.notes}</p>
              {summary && (
                <div style={{ marginTop: 12 }}>
                  <div><strong>Total donations:</strong> {summary.total_donations}</div>
                  <div><strong>Total items donated:</strong> {summary.total_items}</div>
                  <div><strong>Estimated value:</strong> ${Number(summary.estimated_value || 0).toFixed(2)}</div>
                  <div><strong>Last donation:</strong> {summary.last_donation ? new Date(summary.last_donation).toLocaleString() : '—'}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
