"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { api, API_URL } from "@/lib/api";

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    api.listBrandsPublic().then((d) => setBrands(d.brands)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-1">Brand Partners</h1>
        <p className="text-sm text-ink/50 mb-6">
          Other kitchens and brands whose combos you can order right alongside our own menu
        </p>

        {brands.length === 0 ? (
          <p className="text-sm text-ink/40">No brand partners available right now.</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.id}`}
                className="bg-white border border-line rounded-sm overflow-hidden hover:border-saffron2 hover:-translate-y-0.5 transition-all"
              >
                <div
                  className="h-28 bg-line bg-cover bg-center"
                  style={brand.logoUrl ? { backgroundImage: `url(${resolveUrl(brand.logoUrl)})` } : undefined}
                />
                <div className="p-4">
                  <h3 className="font-display text-lg text-ink">{brand.name}</h3>
                  <span className="text-xs text-saffron2">View combos →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
