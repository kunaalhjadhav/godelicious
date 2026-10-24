"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api2 } from "@/lib/api2";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function resolveUrl(url) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// Shown when the admin hasn't published any banner yet (or a picture can't load),
// so the top of the home page never looks empty or broken.
const DEFAULT_SLIDES = [
  { id: "default-1", title: "Meal boxes, made fresh in Mysuru", sub: "Order 10 or more and we deliver to your door", linkUrl: "/meal-boxes" },
  { id: "default-2", title: "Biryani, thalis & party orders", sub: "Browse the full menu and place your order today", linkUrl: "/" },
];

export default function BannerCarousel() {
  const [banners, setBanners] = useState(null); // null = still loading
  const [broken, setBroken] = useState({}); // ids whose picture failed to load
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let tries = 0;
    function load() {
      api2.listBanners()
        .then((d) => setBanners(d.banners || []))
        .catch(() => {
          // Render's free plan can be asleep for a moment - try again a couple of times.
          if (++tries < 3) setTimeout(load, 4000);
          else setBanners([]);
        });
    }
    load();
  }, []);

  const real = (banners || []).filter((b) => !broken[b.id]);
  const slides = real.length ? real : DEFAULT_SLIDES;

  useEffect(() => {
    setIndex(0);
  }, [real.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    // Auto-advance every 6s - admin-managed content, so no fixed assumption
    // about image vs video duration; simple and predictable.
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (banners === null) {
    return <div className="w-full h-64 sm:h-80 bg-charcoal animate-pulse" />;
  }

  const banner = slides[index % slides.length];
  const isDefault = !real.length;

  function handleTap() {
    if (!banner.linkUrl) return;
    if (banner.linkUrl.startsWith("/")) {
      router.push(banner.linkUrl);
    } else {
      window.open(banner.linkUrl, "_blank");
    }
  }

  return (
    <div
      className={`relative w-full h-64 sm:h-80 bg-charcoal overflow-hidden ${banner.linkUrl ? "cursor-pointer" : ""}`}
      onClick={handleTap}
    >
      {isDefault ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center text-center px-6"
          style={{ background: "linear-gradient(135deg, #064e2b 0%, #0f8a4b 55%, #34c26b 100%)" }}
        >
          <h2 className="font-display text-2xl sm:text-4xl text-white mb-2">{banner.title}</h2>
          <p className="text-white/85 text-sm sm:text-base mb-4">{banner.sub}</p>
          <span className="bg-white text-[#0b6b3a] font-semibold text-sm px-5 py-2 rounded-full">Order now</span>
        </div>
      ) : banner.mediaType === "IMAGE" ? (
        <img
          key={banner.id}
          src={resolveUrl(banner.mediaUrl)} alt={banner.title || ""}
          className="w-full h-full object-cover"
          onError={() => setBroken((m) => ({ ...m, [banner.id]: true }))}
        />
      ) : (
        <video
          key={banner.id}
          src={resolveUrl(banner.mediaUrl)}
          className="w-full h-full object-cover"
          autoPlay muted loop playsInline
          onError={() => setBroken((m) => ({ ...m, [banner.id]: true }))}
        />
      )}

      {!isDefault && banner.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-4">
          <p className="text-white font-display text-lg">{banner.title}</p>
        </div>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {slides.map((b, i) => (
            <button
              key={b.id}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index % slides.length ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
