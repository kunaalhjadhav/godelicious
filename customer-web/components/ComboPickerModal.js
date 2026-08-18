"use client";

import { useState } from "react";

// Shown when adding a combo item — lets the customer choose one option per
// group (e.g. "Choose your main", "Choose your drink") before it's added.
export default function ComboPickerModal({ item, onConfirm, onClose }) {
  const [selections, setSelections] = useState({}); // { [groupId]: option }

  function selectOption(group, option) {
    setSelections((prev) => ({ ...prev, [group.id]: option }));
  }

  const allGroupsChosen = item.comboGroups.every((g) => selections[g.id]);

  function confirm() {
    const selectedOptions = item.comboGroups.map((g) => ({
      optionId: selections[g.id].id,
      priceDelta: selections[g.id].priceDelta,
      groupName: g.name,
      optionLabel: selections[g.id].label,
    }));
    onConfirm(selectedOptions);
  }

  return (
    <div className="fixed inset-0 bg-charcoal/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-sm max-w-sm w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl text-ink mb-1">{item.name}</h2>
        <p className="text-sm text-ink/50 mb-4">Customize your combo</p>

        {item.comboGroups.map((group) => (
          <div key={group.id} className="mb-4">
            <h3 className="text-sm font-medium text-ink mb-2">{group.name}</h3>
            <div className="space-y-1.5">
              {group.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => selectOption(group, option)}
                  className={`w-full text-left px-3 py-2 rounded-sm text-sm border flex justify-between ${
                    selections[group.id]?.id === option.id
                      ? "border-saffron2 bg-saffron/10"
                      : "border-line hover:border-saffron2/50"
                  }`}
                >
                  <span>{option.label}</span>
                  {option.priceDelta > 0 && <span className="text-ink/50">+₹{option.priceDelta}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 text-sm px-4 py-2 border border-line rounded-sm">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!allGroupsChosen}
            className="flex-1 bg-charcoal text-paper text-sm px-4 py-2 rounded-sm disabled:opacity-40"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
