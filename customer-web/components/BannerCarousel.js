"use client";

import { useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";

function resolveUrl(url) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api.listBanners().then((d) => setBanners(d.banners)).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    // Auto-advance every 6s — admin-managed content, so no fixed assumption
    // about image vs video duration; simple and predictable.
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners]);

  if (banners.length === 0) return null;

  const banner = banners[index];

  return (
    <div className="relative w-full h-64 sm:h-80 bg-charcoal overflow-hidden">
      {banner.mediaType === "IMAGE" ? (
        <img src={resolveUrl(banner.mediaUrl)} alt={banner.title || ""} className="w-full h-full object-cover" />
      ) : (
        <video
          key={banner.id}
          src={resolveUrl(banner.mediaUrl)}
          className="w-full h-full object-cover"
          autoPlay muted loop playsInline
        />
      )}

      {banner.title && (
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent flex items-end p-6">
          <h2 className="font-display text-2xl text-paper">{banner.title}</h2>
        </div>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-saffron" : "bg-white/40"}`}
              aria-label={`Go to banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
