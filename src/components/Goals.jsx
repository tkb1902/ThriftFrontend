import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";

const METRIC_OPTIONS = [
  { id: "TOTAL_REVENUE", label: "Total Revenue" },
  { id: "TOTAL_DONATIONS", label: "Total Donations" },
  { id: "TOTAL_VOLUNTEER_HOURS", label: "Total Volunteer Hours" }
];

function formatValue(metricType, value) {
  if (metricType === "TOTAL_REVENUE") return `$${Number(value || 0).toFixed(2)}`;
  if (metricType === "TOTAL_VOLUNTEER_HOURS") return `${(Number(value || 0) / 60).toFixed(1)}h`;
  return `${Number(value || 0)}`;
}

export default function Goals({ authHeader }) {
  const [goals, setGoals] = useState(() => {
    try {
      const raw = localStorage.getItem("mf_goals");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [name, setName] = useState("");
  const [metricType, setMetricType] = useState(METRIC_OPTIONS[0].id);
  const [target, setTarget] = useState(0);
  const [range, setRange] = useState("this_month");
  const [loadingMap, setLoadingMap] = useState({});

  useEffect(() => {
    localStorage.setItem("mf_goals", JSON.stringify(goals));
  }, [goals]);

  function dateRangeForKey(key) {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    if (key === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (key === "last_30") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (key === "last_7") {
      start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else if (key === "all_time") {
      start = undefined;
      end = undefined;
    }
    return { start, end };
  }

  async function calculateMetric(metricType, rangeKey) {
    const { start, end } = dateRangeForKey(rangeKey);
    const params = new URLSearchParams();
    if (start) params.set("start", start.toISOString());
    if (end) params.set("end", end.toISOString());

    try {
      setLoadingMap((m) => ({ ...m, [metricType]: true }));
      const data = await apiFetch(`/api/reporting/dashboard${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: authHeader
      });
      if (!data) return 0;
      switch (metricType) {
        case "TOTAL_REVENUE":
          return Number(data.total_sales_value || 0);
        case "TOTAL_DONATIONS":
          return Number(data.total_donations || 0);
        case "TOTAL_VOLUNTEER_HOURS":
          // reporting returns minutes
          return Number(data.total_volunteer_minutes || 0) / 60;
        default:
          return 0;
      }
    } catch (err) {
      console.error(err);
      return 0;
    } finally {
      setLoadingMap((m) => ({ ...m, [metricType]: false }));
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    const goal = {
      id: Date.now(),
      name: name || METRIC_OPTIONS.find((m) => m.id === metricType).label,
      metricType,
      target: Number(target || 0),
      range
    };
    setGoals((g) => [goal, ...g]);
    setName("");
    setTarget(0);
  };

  const handleRemove = (id) => {
    setGoals((g) => g.filter((x) => x.id !== id));
  };

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Goals & Impact</p>
          <h1>Goals</h1>
          <p className="subtitle">Define numeric goals by referencing system metrics; progress is calculated dynamically.</p>
        </div>
      </header>

      <section style={{ padding: 12 }}>
        <form
          onSubmit={handleAdd}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            marginBottom: 12,
            flexWrap: "wrap"
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 180 }}>
            <label style={{ display: "block", fontSize: 12 }}>Name</label>
            <input style={{ width: "100%" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional name" />
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 180 }}>
            <label style={{ display: "block", fontSize: 12 }}>Metric</label>
            <select style={{ width: "100%" }} value={metricType} onChange={(e) => setMetricType(e.target.value)}>
              {METRIC_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 0 140px", minWidth: 120 }}>
            <label style={{ display: "block", fontSize: 12 }}>Target</label>
            <input style={{ width: "100%" }} type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div style={{ flex: "0 0 160px", minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12 }}>Date range</label>
            <select style={{ width: "100%" }} value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="this_month">This month</option>
              <option value="last_30">Last 30 days</option>
              <option value="last_7">Last 7 days</option>
              <option value="all_time">All time</option>
            </select>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <button className="primary" type="submit">Add goal</button>
          </div>
        </form>

        <div style={{ display: "grid", gap: 8 }}>
          {goals.length === 0 && <div>No goals defined yet.</div>}
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} onRemove={() => handleRemove(g.id)} calculateMetric={calculateMetric} loadingMap={loadingMap} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GoalRow({ goal, onRemove, calculateMetric, loadingMap }) {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const val = await calculateMetric(goal.metricType, goal.range);
      if (!cancelled) setCurrent(val);
    })();
    return () => (cancelled = true);
  }, [goal, calculateMetric]);

  const pct = goal.target ? Math.min(100, Math.round((Number(current || 0) / Number(goal.target || 1)) * 100)) : 0;

  return (
    <div className="panel-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <strong>{goal.name}</strong>
        <div style={{ fontSize: 12, color: "#666" }}>{goal.metricType} • {goal.range.replaceAll('_', ' ')}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 8, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: 8, background: pct >= 100 ? "#16a34a" : "#6366f1" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 13 }}>{formatValue(goal.metricType, current)} / {formatValue(goal.metricType, goal.target)} ({pct}%)</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="ghost small" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}
