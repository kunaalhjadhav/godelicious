"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Boxes, Utensils, PlusSquare, Warehouse, CalendarHeart,
  Tag, Tags, Image as ImageIcon, MessageCircle, Bell, BarChart3, Store, BadgePercent, Star,
  SlidersHorizontal, LogOut, Menu as MenuIcon, X, Truck, MapPin, ShieldCheck, Building2, Repeat, PackageOpen, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { BUILD } from "@/lib/version";
import AlertSetup from "@/components/AlertSetup";
import NewOrderWatcher from "@/components/NewOrderWatcher";

// Grouped rather than one flat list — this dashboard has grown to 16 pages,
// and grouping by function (rather than alphabetically or by add-order) is
// what actually keeps it scannable at that size.
const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { href: "/orders", label: "Orders", icon: ClipboardList },
      { href: "/order-types", label: "Order Types", icon: Boxes },
      { href: "/inventory", label: "Inventory", icon: Warehouse },
      { href: "/venue-enquiries", label: "Venue Enquiries", icon: CalendarHeart },
      { href: "/subscriptions", label: "Weekly Meal Boxes", icon: Repeat },
      { href: "/delivery-partners", label: "Delivery Partners", icon: Truck },
      { href: "/live-map", label: "Live Rider Map", icon: MapPin },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/menu", label: "Menu", icon: Utensils },
      { href: "/meal-boxes", label: "Meal Boxes", icon: PackageOpen },
      { href: "/categories", label: "Categories", icon: Tags },
      { href: "/addons", label: "Add-ons", icon: PlusSquare },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/coupons", label: "Coupons", icon: Tag },
      { href: "/banners", label: "Banners", icon: ImageIcon },
      { href: "/marketing", label: "AI Marketing", icon: Sparkles },
      { href: "/conversations", label: "Conversations", icon: MessageCircle },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/chat", label: "Chat", icon: MessageCircle },
      { href: "/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Partners",
    items: [
      { href: "/brands", label: "Brand Partners", icon: Store },
      { href: "/approvals", label: "Item Approvals", icon: ShieldCheck },
      { href: "/offers-review", label: "Brand Offers", icon: BadgePercent },
      { href: "/venues", label: "Venue Partners", icon: Building2 },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/reports", label: "Sales Report", icon: BarChart3 }],
  },
  {
    label: null,
    items: [{ href: "/settings", label: "Settings", icon: SlidersHorizontal }],
  },
];

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  // Close the phone menu whenever the page changes.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user && user.role === "BRAND_PARTNER") router.replace("/partner/dashboard");
    else if (!loading && user && user.role === "VENUE_PARTNER") router.replace("/venue/dashboard");
    else if (!loading && user && user.role === "DELIVERY_PARTNER") router.replace("/rider");
  }, [loading, user, router]);

  if (loading || !user || ["BRAND_PARTNER", "VENUE_PARTNER", "DELIVERY_PARTNER"].includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen lg:flex bg-paper">
      {/* Phone / tablet top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-charcoal text-paper flex items-center gap-3 px-3 h-14 shadow">
        <button onClick={() => setNavOpen(true)} aria-label="Open menu" className="p-2 -ml-1 rounded hover:bg-white/10">
          <MenuIcon size={22} />
        </button>
        <img src="/logo.png?v=3" alt="" className="w-8 h-8 rounded-lg bg-paper object-cover" />
        <div className="font-display text-lg leading-none truncate flex-1">
          {NAV_GROUPS.flatMap((g) => g.items).find((i) => pathname?.startsWith(i.href))?.label || APP_NAME}
        </div>
      </header>

      {navOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setNavOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-charcoal text-paper flex flex-col transform transition-transform duration-200
          ${navOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:w-64 lg:shrink-0 lg:min-h-screen`}
      >
        <div className="px-6 py-6 lg:py-7 border-b border-white/10 flex items-center gap-2.5">
          <img src="/logo.png?v=3" alt={APP_NAME} className="w-11 h-11 rounded-xl bg-paper object-cover ring-1 ring-white/20" />
          <div>
            <div className="font-display text-xl tracking-tight leading-none">{APP_NAME}</div>
            <div className="text-xs text-white/50 mt-0.5 font-mono">{APP_TAGLINE}</div>
          </div>
          <button onClick={() => setNavOpen(false)} aria-label="Close menu" className="lg:hidden ml-auto p-1.5 rounded hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && (
                <div className="px-6 pt-4 pb-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-6 py-2.5 lg:py-2 text-sm border-l-2 transition-colors ${
                      active
                        ? "border-saffron text-saffron bg-white/5"
                        : "border-transparent text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/10 text-xs">
          <AlertSetup />
          <div className="text-white/80">{user?.name}</div>
          <div className="text-white/40 mb-2">{user?.role}</div>
          <div className="text-white/25 font-mono text-[10px] mb-2">build {BUILD}</div>
          <button onClick={logout} className="flex items-center gap-1 text-saffron hover:underline">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden fade-in">{children}</main>
      <NewOrderWatcher />
    </div>
  );
}
