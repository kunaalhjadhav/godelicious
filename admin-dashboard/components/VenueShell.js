"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";
import AlertSetup from "@/components/AlertSetup";

const NAV = [
  { href: "/venue/dashboard", label: "Dashboard" },
  { href: "/venue/calendar", label: "Calendar & Requests" },
  { href: "/venue/tariffs", label: "Tariffs" },
  { href: "/venue/profile", label: "Venue Details" },
];

export default function VenueShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/venue/login");
    else if (!loading && user && user.role === "BRAND_PARTNER") router.replace("/partner/dashboard");
    else if (!loading && user && user.role !== "VENUE_PARTNER") router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "VENUE_PARTNER") {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 shrink-0 bg-charcoal text-paper flex flex-col">
        <div className="px-6 py-7 border-b border-white/10">
          <div className="font-display text-xl tracking-tight leading-none">{APP_NAME}</div>
          <div className="text-xs text-white/50 mt-0.5 font-mono">venue portal</div>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-6 py-2.5 text-sm border-l-2 transition-colors ${
                  active ? "border-saffron text-saffron bg-white/5" : "border-transparent text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-xs">
          <AlertSetup />
          <div className="text-white/80">{user?.name}</div>
          <div className="text-white/40 mb-2">Venue Partner</div>
          <button onClick={logout} className="text-saffron hover:underline">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
