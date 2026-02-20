import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function Shifts({ authHeader, volunteerRoster }) {
  const [shifts, setShifts] = useState([]);
  const [avail, setAvail] = useState([]);
  const [mode, setMode] = useState('list');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ volunteerId: "", startAt: "", endAt: "", notes: "" });
  const [availForm, setAvailForm] = useState({ volunteerId: "", dayOfWeek: "", startTime: "", endTime: "", recurring: false });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const s = await apiFetch("/api/shifts", { headers: authHeader });
      setShifts(Array.isArray(s) ? s : []);
      const a = await apiFetch("/api/shifts/availability", { headers: authHeader });
      setAvail(Array.isArray(a) ? a : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function createShift(e) {
    e.preventDefault();
    try {
      await apiFetch("/api/shifts", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: Number(form.volunteerId), start_at: form.startAt, end_at: form.endAt, notes: form.notes })
      });
      setForm({ volunteerId: "", startAt: "", endAt: "", notes: "" });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  }

  async function createAvail(e) {
    e.preventDefault();
    try {
      await apiFetch("/api/shifts/availability", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: Number(availForm.volunteerId), day_of_week: availForm.dayOfWeek ? Number(availForm.dayOfWeek) : null, start_time: availForm.startTime, end_time: availForm.endTime, recurring: availForm.recurring })
      });
      setAvailForm({ volunteerId: "", dayOfWeek: "", startTime: "", endTime: "", recurring: false });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  }

  async function assignShift(shiftId, volunteerId) {
    try {
      await apiFetch(`/api/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteer_id: Number(volunteerId), status: 'ASSIGNED' })
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  }

  function next7Days() {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push(d);
    }
    return days;
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Shifts</p>
          <h1>Shift scheduling & availability</h1>
          <p className="subtitle">Create shifts, set volunteer availability, and view basic analytics.</p>
        </div>
      </header>

      <section style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <form onSubmit={createShift} style={{ minWidth: 320 }}>
          <label>Volunteer
            <select value={form.volunteerId} onChange={(e) => setForm((p) => ({ ...p, volunteerId: e.target.value }))}>
              <option value="">Select</option>
              {volunteerRoster.map((v) => <option key={v.id} value={v.id}>{v.full_name || v.username}</option>)}
            </select>
          </label>
          <label>Start
            <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} />
          </label>
          <label>End
            <input type="datetime-local" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} />
          </label>
          <label>Notes
            <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </label>
          <div style={{ marginTop: 8 }}><button className="primary" type="submit">Create shift</button></div>
          </form>

          <form onSubmit={createAvail} style={{ minWidth: 320 }}>
          <label>Volunteer
            <select value={availForm.volunteerId} onChange={(e) => setAvailForm((p) => ({ ...p, volunteerId: e.target.value }))}>
              <option value="">Select</option>
              {volunteerRoster.map((v) => <option key={v.id} value={v.id}>{v.full_name || v.username}</option>)}
            </select>
          </label>
          <label>Day of week (0=Sun)
            <input type="number" min="0" max="6" value={availForm.dayOfWeek} onChange={(e) => setAvailForm((p) => ({ ...p, dayOfWeek: e.target.value }))} />
          </label>
          <label>Start time
            <input value={availForm.startTime} onChange={(e) => setAvailForm((p) => ({ ...p, startTime: e.target.value }))} placeholder="09:00" />
          </label>
          <label>End time
            <input value={availForm.endTime} onChange={(e) => setAvailForm((p) => ({ ...p, endTime: e.target.value }))} placeholder="17:00" />
          </label>
          <label>
            Recurring
            <input type="checkbox" checked={availForm.recurring} onChange={(e) => setAvailForm((p) => ({ ...p, recurring: e.target.checked }))} />
          </label>
          <div style={{ marginTop: 8 }}><button className="primary" type="submit">Save availability</button></div>
          </form>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Upcoming shifts</h3>
            <div>
              <button className={mode === 'list' ? 'primary small' : 'ghost small'} onClick={() => setMode('list')}>List</button>
              <button className={mode === 'calendar' ? 'primary small' : 'ghost small'} onClick={() => setMode('calendar')} style={{ marginLeft: 8 }}>Calendar</button>
            </div>
          </div>
          {loading ? <div>Loading...</div> : (
            mode === 'list' ? (
              <div className="table">
                <div className="table-head"><span>Volunteer</span><span>Start</span><span>End</span><span>Status</span><span>Actions</span></div>
                {shifts.map((s) => (
                  <div key={s.id} className="table-row">
                    <div><strong>{s.volunteer_id ? (volunteerRoster.find(v => v.id === s.volunteer_id)?.full_name || `User #${s.volunteer_id}`) : 'Unassigned'}</strong></div>
                    <span>{new Date(s.start_at).toLocaleString()}</span>
                    <span>{s.end_at ? new Date(s.end_at).toLocaleString() : '-'}</span>
                    <span>{s.status}</span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      {!s.volunteer_id ? (
                        <AssignInline shift={s} roster={volunteerRoster} onAssign={assignShift} />
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {next7Days().map((day) => {
                  const dayKey = day.toDateString();
                  const dayShifts = shifts.filter((s) => {
                    const d = new Date(s.start_at);
                    return d.toDateString() === dayKey;
                  });
                  return (
                    <div key={dayKey} style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                      <strong>{day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                      <div style={{ marginTop: 8 }}>
                        {dayShifts.length ? dayShifts.map((s) => (
                          <div key={s.id} style={{ padding: 6, borderRadius: 4, background: '#fafafa', marginBottom: 6 }}>
                            <div style={{ fontSize: 13 }}><strong>{s.volunteer_id ? (volunteerRoster.find(v => v.id === s.volunteer_id)?.full_name || `User #${s.volunteer_id}`) : 'Unassigned'}</strong></div>
                            <div style={{ fontSize: 12, color: '#666' }}>{new Date(s.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {s.end_at ? new Date(s.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</div>
                            {!s.volunteer_id ? <AssignInline shift={s} roster={volunteerRoster} onAssign={assignShift} /> : null}
                          </div>
                        )) : <div style={{ color: '#888' }}>No shifts</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          <h3 style={{ marginTop: 12 }}>Availabilities</h3>
          <div className="table">
            <div className="table-head"><span>Volunteer</span><span>Day/Date</span><span>Window</span><span>Recurring</span></div>
            {avail.map((a) => (
              <div key={a.id} className="table-row">
                <div><strong>{a.volunteer_id}</strong></div>
                <span>{a.date ? new Date(a.date).toLocaleDateString() : `Day ${a.day_of_week}`}</span>
                <span>{a.start_time} - {a.end_time}</span>
                <span>{a.recurring ? 'Yes' : 'No'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AssignInline({ shift, roster, onAssign }) {
  const [sel, setSel] = useState("");
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select value={sel} onChange={(e) => setSel(e.target.value)}>
        <option value="">Assign...</option>
        {roster.map((r) => <option key={r.id} value={r.id}>{r.full_name || r.username}</option>)}
      </select>
      <button className="ghost small" onClick={() => { if (sel) onAssign(shift.id, sel); }}>Assign</button>
    </div>
  );
}

