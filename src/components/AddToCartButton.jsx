import React from "react";
import { useCart } from "../cart";

export default function AddToCartButton({ item, discountPercent = 0 }) {
  const { cartDispatch } = useCart();

  const price = (item.rawPrice ?? (typeof item.price === "string" ? Number(item.price.replace(/[^0-9.]/g, "")) : Number(item.price))) || 0;

  const safeDiscount = Math.max(0, Math.min(100, Number(discountPercent || 0)));

  const handleAdd = (e) => {
    e.stopPropagation();
    cartDispatch({
      type: "ADD_ITEM",
      item: { id: item.id, name: item.name, price, quantity: 1, discountPercent: safeDiscount }
    });
  };

  return (
    <button className="ghost small" type="button" onClick={handleAdd} aria-label={`Add ${item.name} to cart`}>
      Add to cart
    </button>
  );
}
