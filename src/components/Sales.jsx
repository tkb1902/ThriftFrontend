import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";

export default function Sales({ authHeader }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState("sold_at");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  async function fetchSales() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start", new Date(startDate).toISOString());
      if (endDate) params.append("end", new Date(endDate).toISOString());
      params.append("limit", String(perPage));
      params.append("offset", String((page - 1) * perPage));
      const path = `/api/sales?${params.toString()}`;
      const data = await apiFetch(path, { headers: authHeader });
      setSales(Array.isArray(data) ? data : []);
      setHasMore((Array.isArray(data) ? data.length : 0) >= perPage);
    } catch (err) {
      setError(err.message || "Failed to load sales");
    }
    setLoading(false);
  }

  function sortedSales() {
    const copy = [...sales];
    copy.sort((a, b) => {
      let va = a[sortBy];
      let vb = b[sortBy];
      if (sortBy === "sold_at") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      }
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Transactions</p>
          <h1>Sales</h1>
          <p className="subtitle">Browse and query recorded sales.</p>
        </div>
      </header>

      <section style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
          <label>
            Start
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            End
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label>
            Per page
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button className="primary" onClick={() => { setPage(1); fetchSales(); }}>Apply</button>
        </div>

        {error ? <div style={{ color: "red" }}>{error}</div> : null}
        {loading ? <div>Loading...</div> : (
          <div className="table" style={{ maxWidth: 980 }}>
            <div className="table-head">
              <span style={{ cursor: 'pointer' }} onClick={() => { if (sortBy === 'sold_at') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('sold_at'); setSortOrder('desc'); } }}>Date</span>
              <span>Item</span>
              <span>Buyer</span>
              <span>Phone</span>
              <span>Method</span>
              <span style={{ textAlign: 'right' , cursor: 'pointer'}} onClick={() => { if (sortBy === 'sale_price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('sale_price'); setSortOrder('desc'); } }}>Amount</span>
              <span>Transaction</span>
            </div>
            {sortedSales().length ? (
              sortedSales().map((s) => (
                <div key={s.id} className="table-row">
                  <div>
                    <strong>{new Date(s.sold_at).toLocaleString()}</strong>
                    <p style={{ color: '#666' }}>{s.inventory_item_name || `Item #${s.inventory_item_id}`}</p>
                  </div>
                  <span>
                    {s.buyer_name || '-'}
                  </span>
                  <span>
                    {s.buyer_phone || '-'}
                  </span>
                  <span>
                    {s.method || '-'}
                  </span>
                  <span style={{ textAlign: 'right' }}>${Number(s.sale_price || 0).toFixed(2)}</span>
                  <span style={{ color: '#666' }}>{s.id}</span>
                </div>
              ))
            ) : (
              <div className="table-empty">No sales found.</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="ghost" onClick={() => { if (page > 1) { setPage(page - 1); } }} disabled={page <= 1}>Previous</button>
          <div style={{ alignSelf: 'center' }}>Page {page}</div>
          <button className="ghost" onClick={() => { if (hasMore) { setPage(page + 1); } }} disabled={!hasMore}>Next</button>
        </div>
      </section>
    </div>
  );
}
