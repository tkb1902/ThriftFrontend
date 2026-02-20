import React, { useReducer, createContext, useContext, useEffect } from "react";

export const CartContext = createContext();

export const initialCartState = {
  items: [], // { id, name, price, quantity, discountPercent }
  globalDiscountPercent: 0,
  taxPercent: 0,
  itemDefaults: {}, // default discountPercent per item id
  buyerName: "",
  buyerPhone: ""
};

const STORAGE_KEY = "mf_cart_settings";

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const safe = {
      globalDiscountPercent: Number(parsed.globalDiscountPercent) || 0,
      taxPercent: Number(parsed.taxPercent) || 0,
      itemDefaults: parsed.itemDefaults || {},
      buyerName: parsed.buyerName || "",
      buyerPhone: parsed.buyerPhone || ""
    };
    return safe;
  } catch (e) {
    return {};
  }
}

function saveSettings(state) {
  try {
    const payload = JSON.stringify({
      globalDiscountPercent: state.globalDiscountPercent || 0,
      taxPercent: state.taxPercent || 0,
      itemDefaults: state.itemDefaults || {},
      buyerName: state.buyerName || "",
      buyerPhone: state.buyerPhone || ""
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    // ignore storage errors
  }
}

export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((item) => item.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.item.id
              ? {
                  ...item,
                  quantity: item.quantity + (action.item.quantity || 1),
                  discountPercent:
                    action.item.discountPercent != null
                      ? action.item.discountPercent
                      : item.discountPercent
                }
              : item
          )
        };
      }
      // if no discountPercent provided on the action, apply any item default
      const defaultPct = state.itemDefaults?.[action.item.id];
      const itemToAdd = {
        ...action.item,
        quantity: action.item.quantity || 1,
        discountPercent: action.item.discountPercent != null ? action.item.discountPercent : defaultPct
      };
      return {
        ...state,
        items: [...state.items, itemToAdd]
      };
    }
    case "SET_GLOBAL_DISCOUNT":
      return { ...state, globalDiscountPercent: Number(action.percent) || 0 };
    case "SET_TAX_PERCENT":
      return { ...state, taxPercent: Number(action.percent) || 0 };
    case "SET_ITEM_DISCOUNT":
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.id ? { ...it, discountPercent: Number(action.percent) || 0 } : it))
      };
    case "SET_ITEM_DEFAULT":
      return { ...state, itemDefaults: { ...(state.itemDefaults || {}), [action.id]: Number(action.percent) || 0 } };
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.id ? { ...item, quantity: action.quantity } : item))
      };
    case "CLEAR_CART":
      return { ...initialCartState, taxPercent: state.taxPercent, globalDiscountPercent: state.globalDiscountPercent, itemDefaults: state.itemDefaults };
    case "SET_BUYER_NAME":
      return { ...state, buyerName: action.name || "" };
    case "SET_BUYER_PHONE":
      return { ...state, buyerPhone: action.phone || "" };
    default:
      return state;
  }
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

export function CartProvider({ children }) {
  // seed initial state with any saved settings (discounts/taxes/defaults)
  const saved = typeof window !== "undefined" ? loadSavedSettings() : {};
  const seed = { ...initialCartState, ...saved };
  const [cart, cartDispatch] = useReducer(cartReducer, seed);

  // persist relevant settings whenever they change
  useEffect(() => {
    saveSettings(cart);
  }, [cart.globalDiscountPercent, cart.taxPercent, cart.itemDefaults, cart.buyerName, cart.buyerPhone]);

  return <CartContext.Provider value={{ cart, cartDispatch }}>{children}</CartContext.Provider>;
}
