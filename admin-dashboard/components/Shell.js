"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/menu", label: "Menu" },
  { href: "/inventory", label: "Inventory" },
  { href: "/venue-enquiries", label: "Venue Enquiries" },
  { href: "/coupons", label: "Coupons" },
  { href: "/banners", label: "Banners" },
  { href: "/chat", label: "Chat" },
  { href: "/notifications", label: "Notifications" },
  { href: "/reports", label: "Sales Report" },
  { href: "/brands", label: "Brand Partners" },
  { href: "/reviews", label: "Reviews" },
  { href: "/settings", label: "Settings" },
];

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 shrink-0 bg-charcoal text-paper flex flex-col">
        <div className="px-6 py-7 border-b border-white/10 flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-md" />
          <div>
            <div className="font-display text-xl tracking-tight leading-none">{APP_NAME}</div>
            <div className="text-xs text-white/50 mt-0.5 font-mono">{APP_TAGLINE}</div>
          </div>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-6 py-2.5 text-sm border-l-2 transition-colors ${
                  active
                    ? "border-saffron text-saffron bg-white/5"
                    : "border-transparent text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-xs">
          <div className="text-white/80">{user?.name}</div>
          <div className="text-white/40 mb-2">{user?.role}</div>
          <button onClick={logout} className="text-saffron hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
