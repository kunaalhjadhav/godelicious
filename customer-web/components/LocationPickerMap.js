"use client";

import { useEffect, useRef, useState } from "react";

// Loads the Google Maps JavaScript API once (shared across every instance of
// this component on the page) and resolves when it's ready.
let mapsLoadingPromise = null;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoadingPromise) return mapsLoadingPromise;

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("Google Maps isn't configured — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Maps."));
    document.head.appendChild(script);
  });
  return mapsLoadingPromise;
}

// An interactive map with a single draggable pin. Lets the customer fine-tune
// their exact delivery point visually, as a complement to (not a replacement
// for) the one-tap "use my current location" GPS button.
export default function LocationPickerMap({ initialLat, initialLng, onLocationSelected }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const startLat = initialLat || 12.9716; // sensible fallback center (Bengaluru)
        const startLng = initialLng || 77.5946;

        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: startLat, lng: startLng },
          zoom: 15,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const marker = new window.google.maps.Marker({
          position: { lat: startLat, lng: startLng },
          map,
          draggable: true,
        });

        function handlePositionChange() {
          const pos = marker.getPosition();
          reverseGeocodeAndReport(pos.lat(), pos.lng());
        }
        marker.addListener("dragend", handlePositionChange);
        map.addListener("click", (e) => {
          marker.setPosition(e.latLng);
          reverseGeocodeAndReport(e.latLng.lat(), e.latLng.lng());
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setReady(true);
      })
      .catch((err) => setLoadError(err.message));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reverseGeocodeAndReport(lat, lng) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    let address = null;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
      const data = await res.json();
      if (data.status === "OK" && data.results?.[0]) address = data.results[0].formatted_address;
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
    onLocationSelected({ latitude: lat, longitude: lng, address });
  }

  if (loadError) {
    return <p className="text-xs text-chili py-2">{loadError}</p>;
  }

  return (
    <div className="mb-3">
      <div ref={mapRef} className="w-full h-56 rounded-sm border border-line bg-line" />
      {ready && (
        <p className="text-xs text-ink/50 mt-1">Drag the pin, or tap anywhere on the map, to set your exact location.</p>
      )}
    </div>
  );
}
