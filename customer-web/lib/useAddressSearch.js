"use client";
import { useRef, useState } from "react";
import { api2 } from "@/lib/api2";

// Address autocomplete for the checkout / booking address box.
//   const { suggestions, search, pick, clear } = useAddressSearch({ onPick: ({address, latitude, longitude}) => ... });
export function useAddressSearch({ onPick }) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);
  const seq = useRef(0);

  function clear() {
    setSuggestions([]);
  }

  function search(text, near) {
    if (timer.current) clearTimeout(timer.current);
    setSuggestions([]);
    if (!text || text.trim().length < 3) return;
    timer.current = setTimeout(async () => {
      const mine = ++seq.current;
      setSearching(true);
      try {
        const d = await api2.placesAutocomplete(text.trim(), near?.latitude, near?.longitude);
        if (mine === seq.current) setSuggestions(d.suggestions || []);
      } catch (_) {
        /* typing manually still works */
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 400);
  }

  async function pick(s) {
    setSuggestions([]);
    seq.current++;
    let { latitude, longitude } = s;
    let address = s.description;
    if (latitude == null) {
      try {
        const d = await api2.placeDetails(s.id);
        latitude = d.latitude;
        longitude = d.longitude;
      } catch (_) {}
    }
    onPick({ address, latitude, longitude });
  }

  return { suggestions, searching, search, pick, clear };
}
