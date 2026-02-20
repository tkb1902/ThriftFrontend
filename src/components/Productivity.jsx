import React, { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../api";

function BarChart({ data, labels, width = 360, height = 120, color = '#7b3ff2' }) {
  const max = Math.max(...data, 1);
  const barW = Math.floor(width / data.length) - 6;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((v, i) => {
        const h = Math.round((v / max) * (height - 20));
        const x = i * (barW + 6) + 6;
        const y = height - h - 20;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={4} fill={color} opacity={0.95} />
            <text x={x + barW / 2} y={height - 6} fontSize={10} textAnchor="middle" fill="#444">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ value, total, size = 120, color = '#5b1fb6' }) {
  const radius = (size / 2) - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total ? Math.min(1, value / total) : 0;
  const dash = pct * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={radius} fill="#f3f2f7" />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#eee" strokeWidth={12} />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={12} strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={14} fill="#222">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

export default function Productivity({ authHeader }) {
  const [metrics, setMetrics] = useState(null);
  const [donations, setDonations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [m, d, s] = await Promise.all([
        apiFetch('/api/shifts/productivity', { headers: authHeader }),
        apiFetch('/api/donations', { headers: authHeader }),
        apiFetch('/api/shifts', { headers: authHeader }),
      ]);
      setMetrics(m);
      setDonations(Array.isArray(d) ? d : []);
      setShifts(Array.isArray(s) ? s : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const last7 = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0,0,0,0);
      return d;
    });
    const labels = days.map(d => d.toLocaleDateString(undefined, { weekday: 'short' }));
    const counts = days.map((day) => {
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return donations.reduce((acc, item) => {
        const r = new Date(item.received_at);
        return acc + (r >= day && r < next ? 1 : 0);
      }, 0);
    });
    return { labels, counts };
  }, [donations]);

  const shiftStats = useMemo(() => {
    const total = shifts.length;
    const filled = shifts.filter(s => s.volunteer_id).length;
    return { total, filled };
  }, [shifts]);

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Productivity</p>
          <h1>Volunteer Productivity</h1>
          <p className="subtitle">Visual metrics: shifts, hours, and donation processing.</p>
        </div>
      </header>

      <section style={{ padding: 12 }}>
        {loading && <div>Loading...</div>}
        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
              <div className="panel-card"><h4>Total shifts</h4><strong>{metrics.total_shifts}</strong></div>
              <div className="panel-card"><h4>Shifts filled</h4><strong>{metrics.shifts_filled}</strong></div>
              <div className="panel-card"><h4>Minutes worked</h4><strong>{metrics.total_minutes_worked}</strong></div>
              <div className="panel-card"><h4>Donations processed</h4><strong>{metrics.donations_processed}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }} className="panel-card">
                <h4>Donations — last 7 days</h4>
                <BarChart data={last7.counts} labels={last7.labels} width={420} height={140} />
              </div>
              <div style={{ width: 160 }} className="panel-card">
                <h4>Shift fill rate</h4>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 140 }}>
                  <Donut value={shiftStats.filled} total={shiftStats.total} />
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <div><strong>{shiftStats.filled}</strong> / {shiftStats.total} shifts</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div>No metrics yet.</div>
        )}
      </section>
    </div>
  );
}
