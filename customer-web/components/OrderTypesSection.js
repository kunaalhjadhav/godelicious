"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api, API_URL } from "@/lib/api";

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function OrderTypesSection() {
  const [orderTypes, setOrderTypes] = useState([]);
  const router = useRouter();

  useEffect(() => {
    api.listOrderTypes().then((d) => setOrderTypes(d.orderTypes)).catch(() => {});
  }, []);

  if (orderTypes.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-5 -mt-10 sm:-mt-14 relative z-10 mb-4 fade-in">
      <div className="grid sm:grid-cols-3 gap-4">
        {orderTypes.map((ot) => (
          <button
            key={ot.id}
            onClick={() => router.push(`/booking/${ot.id}`)}
            className="group text-left card-surface card-surface--interactive shadow-lg overflow-hidden"
          >
            <div
              className="h-32 bg-line bg-cover bg-center"
              style={ot.imageUrl ? { backgroundImage: `url(${resolveUrl(ot.imageUrl)})` } : undefined}
            />
            <div className="p-4">
              <h3 className="font-display text-lg text-ink mb-1">{ot.name}</h3>
              {ot.description && <p className="text-xs text-ink/60 line-clamp-2">{ot.description}</p>}
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-saffron2 group-hover:gap-1.5 transition-all">
                Book this <ArrowRight size={12} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
