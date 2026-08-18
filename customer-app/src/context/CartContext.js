import React, { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

function lineKey(menuItemId, selectedOptions) {
  const optKey = selectedOptions?.length
    ? selectedOptions.map((o) => o.optionId).sort().join(",")
    : "";
  return `${menuItemId}::${optKey}`;
}

function unitPrice(menuItem, selectedOptions) {
  const deltaSum = (selectedOptions || []).reduce((sum, o) => sum + (o.priceDelta || 0), 0);
  return menuItem.price + deltaSum;
}

export function CartProvider({ children }) {
  // { [lineKey]: { menuItem, quantity, selectedOptions } }
  const [lines, setLines] = useState({});

  function addItem(menuItem, selectedOptions = []) {
    const key = lineKey(menuItem.id, selectedOptions);
    setLines((prev) => {
      const existing = prev[key];
      const quantity = (existing?.quantity || 0) + 1;
      return { ...prev, [key]: { menuItem, quantity, selectedOptions } };
    });
  }

  function decrementItem(key) {
    setLines((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...existing, quantity: existing.quantity - 1 } };
    });
  }

  function removeItem(key) {
    setLines((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function clearCart() {
    setLines({});
  }

  const items = useMemo(
    () =>
      Object.entries(lines).map(([key, line]) => ({
        key,
        ...line,
        unitPrice: unitPrice(line.menuItem, line.selectedOptions),
      })),
    [lines]
  );
  const totalAmount = useMemo(
    () => items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [items]
  );
  const itemCount = useMemo(() => items.reduce((sum, line) => sum + line.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, totalAmount, itemCount, addItem, decrementItem, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
