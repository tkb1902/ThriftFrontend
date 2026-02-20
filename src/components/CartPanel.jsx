import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../cart";
import { apiFetch } from "../api";

export default function CartPanel() {
  const { cart, cartDispatch } = useCart();

  const clean = (n) => Math.max(0, Number(n) || 0);

  // per-item discounted totals
  const itemsWithDiscount = cart.items.map((it) => {
    const perItemPercent = it.discountPercent != null ? Number(it.discountPercent) : (cart.itemDefaults?.[it.id] != null ? Number(cart.itemDefaults[it.id]) : 0);
    const pct = Math.max(0, Math.min(100, perItemPercent || 0));
    const price = Number(it.price) || 0;
    const discounted = price * (1 - pct / 100);
    return { ...it, price, discountPercent: pct, discounted, lineTotal: discounted * (it.quantity || 0) };
  });

  const subtotal = itemsWithDiscount.reduce((s, it) => s + it.lineTotal, 0);

  const safeGlobalDiscount = Math.max(0, Math.min(100, Number(cart.globalDiscountPercent || 0)));
  const discountedSubtotal = subtotal * (1 - safeGlobalDiscount / 100);

  const safeTax = Math.max(0, Number(cart.taxPercent || 0));
  const tax = discountedSubtotal * (safeTax / 100);

  const total = discountedSubtotal + tax;

  // Stripe modal and state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const stripePromiseRef = useRef(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  // use buyer fields from cart state
  const buyerName = cart.buyerName || "";
  const buyerPhone = cart.buyerPhone || "";

  const HISTORY_KEY = "mf_payments_history";
  const MAX_HISTORY = 20;

  function loadPaymentHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  // load saved history on mount
  useEffect(() => {
    try {
      const saved = loadPaymentHistory();
      setPaymentHistory(saved);
    } catch (e) {}
  }, []);

  function savePaymentHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function pushPaymentToHistory(entry) {
    try {
      const stamp = { ...entry, timestamp: new Date().toISOString() };
      const next = [stamp].concat(paymentHistory).slice(0, MAX_HISTORY);
      setPaymentHistory(next);
      savePaymentHistory(next);
    } catch (e) {}
  }

  function getAuthHeader() {
    const token = localStorage.getItem("mf_token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function recordSales(details) {
    // create one sale per item in the cart
    const headers = { ...getAuthHeader(), "Content-Type": "application/json" };
    const method = details.method || "stripe";
    const paymentId = details.id || details.payment_id || null;
    for (const it of itemsWithDiscount) {
      try {
        await apiFetch("/api/sales", {
          method: "POST",
          headers,
          body: JSON.stringify({
            inventory_item_id: it.id,
            sale_price: it.discounted,
            buyer_name: cart.buyerName || undefined,
            buyer_phone: cart.buyerPhone || undefined,
            method,
            payment_id: paymentId || undefined
          })
        });
      } catch (err) {
        // log and continue
        console.error("Failed to record sale for item", it.id, err);
      }
    }
  }

  return (
    <div style={{ position: "fixed", top: 16, right: 16, width: 320, background: "#fff", border: "1px solid #ddd", padding: 12, zIndex: 2000, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 32px)" }}>
      <h4 style={{ margin: "0 0 8px" }}>Cart</h4>
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <button className="ghost small" type="button" onClick={() => setShowHistory(true)}>Recent payments</button>
      </div>
      <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
        {cart.items.length === 0 ? (
          <div style={{ color: "#666" }}>Cart is empty</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {itemsWithDiscount.map((item) => (
              <li key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    ${item.discounted.toFixed(2)} × {item.quantity}
                    {item.discountPercent ? (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#888" }}>({item.discountPercent}% off)</span>
                    ) : null}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>${item.lineTotal.toFixed(2)}</div>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => cartDispatch({ type: "UPDATE_QUANTITY", id: item.id, quantity: Math.max(1, item.quantity - 1) })} style={{ marginRight: 6 }}>−</button>
                    <button onClick={() => cartDispatch({ type: "UPDATE_QUANTITY", id: item.id, quantity: item.quantity + 1 })}>+</button>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => cartDispatch({ type: "REMOVE_ITEM", id: item.id })} style={{ color: "#d00" }}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span>Discount ({safeGlobalDiscount}%)</span>
          <span>-${(subtotal - discountedSubtotal).toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span>Tax ({safeTax}%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontWeight: 700 }}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Per-item discount</strong>
          <div style={{ fontSize: 12, color: "#666" }}>Adjust a discount percent for an item in the cart.</div>
        </div>
        {itemsWithDiscount.map((it) => (
          <div key={`disc-${it.id}`} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>{it.name} ({it.quantity})</div>
            <input
              type="number"
              min="0"
              max="100"
              value={it.discountPercent}
              onChange={(e) => cartDispatch({ type: "SET_ITEM_DISCOUNT", id: it.id, percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              style={{ width: 70 }}
            />
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => cartDispatch({ type: "CLEAR_CART" })} style={{ flex: 1 }}>Clear</button>
          <button onClick={() => handleCashCheckout()} style={{ flex: 1 }}>Pay cash</button>
        </div>
        <div style={{ marginTop: 10, borderTop: '1px dashed #eee', paddingTop: 10 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}><strong>Buyer (optional)</strong></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Buyer name"
              value={buyerName}
              onChange={(e) => cartDispatch({ type: 'SET_BUYER_NAME', name: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              placeholder="Buyer phone"
              value={buyerPhone}
              onChange={(e) => cartDispatch({ type: 'SET_BUYER_PHONE', phone: e.target.value })}
              style={{ width: 150 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => handleStripeCheckout()} style={{ flex: 1 }} disabled={stripeLoading}>
            {stripeLoading ? 'Preparing...' : 'Pay with Stripe'}
          </button>
        </div>
      </div>
      {showStripeModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', padding: 16, width: 480, maxWidth: '95%', borderRadius: 6 }}>
            <h3>Pay with card</h3>
                <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4, marginBottom: 12 }}>
                  {stripeError ? <div style={{ color: 'red', marginBottom: 8 }}>{stripeError}</div> : null}
                  <div style={{ color: '#666', marginBottom: 8 }}>Buyer information is captured in the cart.</div>
                  {/** Wrap the payment UI with Elements and render CardElement via StripeModalContent */}
                  {stripePromiseRef.current ? (
                    <Elements stripe={stripePromiseRef.current} options={{ clientSecret: stripeClientSecret }}>
                      <StripeModalContent
                        clientSecret={stripeClientSecret}
                        onCancel={() => setShowStripeModal(false)}
                        onSuccess={(details) => {
                          // parent handles recording sales, clearing cart and showing in-app confirmation
                          (async () => {
                            try {
                              await recordSales(details);
                            } catch (e) {
                              console.error('recordSales failed', e);
                            }
                            cartDispatch({ type: 'CLEAR_CART' });
                            setShowStripeModal(false);
                            setPaymentResult(details);
                            pushPaymentToHistory(details);
                          })();
                        }}
                        items={itemsWithDiscount}
                        subtotal={subtotal}
                        globalDiscount={safeGlobalDiscount}
                        tax={tax}
                        total={total}
                      />
                    </Elements>
                  ) : (
                    <div style={{ color: '#666' }}>Initializing Stripe...</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="ghost" onClick={() => setShowStripeModal(false)} disabled={paymentProcessing}>Cancel</button>
                </div>
          </div>
        </div>
      ) : null}
      {paymentResult ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: '#fff', padding: 20, width: 560, maxWidth: '95%', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>{paymentResult.status === 'success' ? 'Payment successful' : 'Payment failed'}</h3>
            <div style={{ marginBottom: 12 }}>
              <strong>Method:</strong> {paymentResult.method || 'Unknown'}
            </div>
            {paymentResult.id ? (
              <div style={{ marginBottom: 8 }}><strong>Transaction ID:</strong> {paymentResult.id}</div>
            ) : null}
            <div style={{ marginBottom: 8 }}><strong>Amount:</strong> ${Number(paymentResult.amount || 0).toFixed(2)}</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th></tr></thead>
                <tbody>
                  {(paymentResult.items || []).map((it) => (
                    <tr key={it.id}><td>{it.name}</td><td style={{ textAlign: 'right' }}>{it.quantity}</td><td style={{ textAlign: 'right' }}>${it.discounted.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paymentResult.status !== 'success' && paymentResult.error ? (
              <div style={{ color: 'red', marginTop: 12 }}>{paymentResult.error}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="ghost" onClick={() => setPaymentResult(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
      {showHistory ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4100 }}>
          <div style={{ background: '#fff', padding: 16, width: 720, maxWidth: '95%', borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Recent payments</h3>
            {paymentHistory.length === 0 ? (
              <div style={{ color: '#666' }}>No recent payments</div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={{ textAlign: 'left' }}>When</th><th style={{ textAlign: 'left' }}>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'left' }}>ID</th></tr></thead>
                  <tbody>
                    {paymentHistory.map((p, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                        <td style={{ padding: '8px 6px' }}>{new Date(p.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '8px 6px' }}>{p.method}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right' }}>${Number(p.amount || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px 6px' }}>{p.id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="ghost" onClick={() => { setPaymentHistory([]); savePaymentHistory([]); }}>Clear history</button>
              <button className="primary" onClick={() => setShowHistory(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  async function handleCashCheckout() {
    // accept cash: generate receipt, record sales, then clear
    const receipt = makeReceiptHtml(itemsWithDiscount, subtotal, safeGlobalDiscount, tax, total, "Cash");
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(receipt);
      w.document.close();
      w.print();
      w.close();
    }
    const details = { status: "success", method: "Cash", id: null, amount: total, items: itemsWithDiscount };
    try {
      await recordSales(details);
    } catch (e) {
      console.error('recordSales failed (cash)', e);
    }
    cartDispatch({ type: "CLEAR_CART" });
    const result = { status: "success", method: "Cash", amount: total, items: itemsWithDiscount };
    setPaymentResult(result);
    pushPaymentToHistory(result);
  }

  async function handleStripeCheckout() {
    setStripeError("");
    const amountCents = Math.round(total * 100);
    try {
      setStripeLoading(true);
      const data = await apiFetch("/api/payments/stripe-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents })
      });
      if (!data || !data.clientSecret) {
        setStripeLoading(false);
        setStripeError("Server did not return a payment client secret. Ensure backend endpoint /api/payments/stripe-intent exists.");
        return;
      }
      setStripeClientSecret(data.clientSecret);
      // prepare stripe promise using publishable key
      const publishable = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishable) {
        setStripeError("Missing VITE_STRIPE_PUBLISHABLE_KEY in frontend environment.");
        setStripeLoading(false);
        return;
      }
      stripePromiseRef.current = loadStripe(publishable);
      setShowStripeModal(true);
      setStripeLoading(false);
    } catch (err) {
      setStripeLoading(false);
      setStripeError(err.message || "Stripe checkout failed.");
    }
  }

  // legacy script-based mounting removed; we now use @stripe/react-stripe-js Elements

  // processStripePayment is now handled inside StripeModalContent via hooks

  function StripeModalContent({ clientSecret, onCancel, onSuccess, items, subtotal, globalDiscount, tax, total }) {
    const stripe = useStripe();
    const elements = useElements();
    const [localProcessing, setLocalProcessing] = useState(false);
    const [localError, setLocalError] = useState("");

    async function handlePay() {
      setLocalError("");
      setLocalProcessing(true);
      try {
        if (!stripe || !elements) {
          setLocalError('Stripe not ready.');
          setLocalProcessing(false);
          return;
        }
        const card = elements.getElement(CardElement);
        const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
        if (result.error) {
          setLocalError(result.error.message || 'Payment failed');
          setLocalProcessing(false);
          return;
        }
        if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          const receipt = makeReceiptHtml(items, subtotal, globalDiscount, tax, total, 'Card (Stripe)');
          const w = window.open('', '_blank');
          if (w) {
            w.document.write(receipt);
            w.document.close();
            w.print();
            w.close();
          }
          const details = { status: 'success', method: 'Card (Stripe)', id: result.paymentIntent.id, amount: (result.paymentIntent.amount || Math.round(total * 100)) / 100, items };
          onSuccess(details);
        }
      } catch (e) {
        setLocalError(e.message || 'Payment processing error');
      }
      setLocalProcessing(false);
    }

    return (
      <div>
        <div style={{ padding: 8 }}>
          <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
        </div>
        {localError ? <div style={{ color: 'red', marginTop: 8 }}>{localError}</div> : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" className="ghost" onClick={onCancel} disabled={localProcessing}>Cancel</button>
          <button type="button" className="primary" onClick={handlePay} disabled={localProcessing}>{localProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}</button>
        </div>
      </div>
    );
  }

  function makeReceiptHtml(items, subtotalVal, globalPct, taxVal, totalVal, method) {
    const lines = items.map((it) => `<tr><td>${escapeHtml(it.name)}</td><td>${it.quantity}</td><td>$${it.discounted.toFixed(2)}</td><td>$${it.lineTotal.toFixed(2)}</td></tr>`).join("\n");
    return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title></head><body><h2>Receipt</h2><p>Payment method: ${method}</p><table border="0" cellpadding="6" cellspacing="0">${lines}</table><hr/><div>Subtotal: $${subtotalVal.toFixed(2)}</div><div>Global discount: ${globalPct}%</div><div>Tax: $${taxVal.toFixed(2)}</div><h3>Total: $${totalVal.toFixed(2)}</h3></body></html>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}
