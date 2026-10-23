"use client";
import { MapPin } from "lucide-react";

export default function AddressSuggestions({ suggestions, searching, onPick }) {
  if (!searching && !suggestions.length) return null;
  return (
    <div className="border border-line rounded-sm bg-white shadow-sm mb-2 -mt-1 overflow-hidden">
      {searching && !suggestions.length && <p className="text-xs text-ink/50 px-3 py-2">Searching…</p>}
      {suggestions.slice(0, 6).map((s) => (
        <button
          type="button" key={s.id} onClick={() => onPick(s)}
          className="w-full text-left flex items-start gap-2 px-3 py-2 text-sm hover:bg-paper border-b border-line last:border-0"
        >
          <MapPin size={14} className="mt-0.5 shrink-0 text-saffron2" />
          <span>{s.description}</span>
        </button>
      ))}
    </div>
  );
}
