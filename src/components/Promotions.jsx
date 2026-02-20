import React, { useState } from "react";
import { useCart } from "../cart";

export default function Promotions({ inventoryItems = [] }) {
  const { cart, cartDispatch } = useCart();
  const [globalDiscount, setGlobalDiscount] = useState(cart.globalDiscountPercent || 0);
  const [taxPercent, setTaxPercent] = useState(cart.taxPercent || 0);
  const [selectedItem, setSelectedItem] = useState(inventoryItems[0]?.id || "");
  const [itemDefaultPct, setItemDefaultPct] = useState(
    cart.itemDefaults?.[selectedItem] ?? 0
  );

  const applyGlobal = (e) => {
    e.preventDefault();
    const pct = Math.max(0, Math.min(100, Number(globalDiscount) || 0));
    cartDispatch({ type: "SET_GLOBAL_DISCOUNT", percent: pct });
  };

  const applyTax = (e) => {
    e.preventDefault();
    const pct = Math.max(0, Number(taxPercent) || 0);
    cartDispatch({ type: "SET_TAX_PERCENT", percent: pct });
  };

  const applyItemDefault = (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const pct = Math.max(0, Math.min(100, Number(itemDefaultPct) || 0));
    cartDispatch({ type: "SET_ITEM_DEFAULT", id: selectedItem, percent: pct });
  };

  return (
    <div className="promotions-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pricing controls</p>
          <h1>Promotions, Discounts & Taxes</h1>
          <p className="subtitle">Configure global discounts and tax rates for the POS.</p>
        </div>
      </header>

      <section style={{ padding: 12, maxWidth: 720 }}>
        <form onSubmit={applyGlobal} style={{ marginBottom: 12 }}>
          <label>
            Global discount percent (applies to subtotal)
            <input
              type="number"
              min="0"
              max="100"
              value={globalDiscount}
              onChange={(e) => setGlobalDiscount(e.target.value)}
            />
          </label>
          <div style={{ marginTop: 8 }}>
            <button type="submit" className="primary">Apply global discount</button>
          </div>
        </form>

        <form onSubmit={applyTax} style={{ marginBottom: 12 }}>
          <label>
            Tax percent (applied after discount)
            <input
              type="number"
              min="0"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
            />
          </label>
          <div style={{ marginTop: 8 }}>
            <button type="submit" className="primary">Set tax rate</button>
          </div>
        </form>

        <hr />

        <section style={{ marginTop: 12 }}>
          <h3>Default item discounts</h3>
          <p className="subtitle">Set a default percentage discount for an inventory item. This value will be applied when the item is added to the cart unless an explicit per-item discount is set in the cart.</p>
          <form onSubmit={applyItemDefault}>
            <label>
              Item
              <select value={selectedItem} onChange={(e) => { setSelectedItem(e.target.value); setItemDefaultPct(cart.itemDefaults?.[e.target.value] ?? 0); }}>
                <option value="">-- select --</option>
                {inventoryItems.map((it) => (
                  <option value={it.id} key={it.id}>{it.name}</option>
                ))}
              </select>
            </label>
            <label>
              Default discount %
              <input type="number" min="0" max="100" value={itemDefaultPct} onChange={(e) => setItemDefaultPct(e.target.value)} />
            </label>
            <div style={{ marginTop: 8 }}>
              <button type="submit" className="primary">Set default</button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}
