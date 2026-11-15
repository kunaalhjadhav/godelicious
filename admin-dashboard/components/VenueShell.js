"use client";

import { useEffect, useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";
import AlertSetup from "@/components/AlertSetup";

const NAV = [
  { href: "/venue/dashboard", label: "Dashboard" },
  { href: "/venue/calendar", label: "Calendar & Requests" },
  { href: "/venue/bookings", label: "Bookings & Payments" },
  { href: "/venue/tariffs", label: "Tariffs" },
  { href: "/venue/profile", label: "Venue Details & Gallery" },
  { href: "/venue/chat", label: "Chat with us" },
];

export default function VenueShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (!loading && !user) router.replace("/venue/login");
    else if (!loading && user && user.role === "BRAND_PARTNER") router.replace("/partner/dashboard");
    else if (!loading && user && user.role === "DELIVERY_PARTNER") router.replace("/rider");
    else if (!loading && user && user.role !== "VENUE_PARTNER") router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "VENUE_PARTNER") {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen lg:flex bg-paper">
      <header className="lg:hidden sticky top-0 z-30 bg-charcoal text-paper flex items-center gap-3 px-3 h-14 shadow">
        <button onClick={() => setNavOpen(true)} aria-label="Open menu" className="p-2 -ml-1 rounded hover:bg-white/10"><MenuIcon size={22} /></button>
        <div className="font-display text-lg leading-none truncate flex-1">{NAV.find((i) => pathname?.startsWith(i.href))?.label || APP_NAME}</div>
      </header>
      {navOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setNavOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-charcoal text-paper flex flex-col transform transition-transform duration-200
          ${navOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:translate-x-0 lg:w-60 lg:shrink-0 lg:min-h-screen`}>
        <div className="px-6 py-7 border-b border-white/10 relative">
          <button onClick={() => setNavOpen(false)} aria-label="Close menu" className="lg:hidden absolute right-3 top-5 p-1.5 rounded hover:bg-white/10"><X size={20} /></button>
          <div className="font-display text-xl tracking-tight leading-none">{APP_NAME}</div>
          <div className="text-xs text-white/50 mt-0.5 font-mono">venue portal</div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
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
      <main className="admin-main flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
