"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Boxes, Utensils, PlusSquare, Warehouse, CalendarHeart,
  Tag, Tags, Image as ImageIcon, MessageCircle, Bell, BarChart3, Store, BadgePercent, Star,
  SlidersHorizontal, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

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
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/menu", label: "Menu", icon: Utensils },
      { href: "/categories", label: "Categories", icon: Tags },
      { href: "/addons", label: "Add-ons", icon: PlusSquare },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/coupons", label: "Coupons", icon: Tag },
      { href: "/banners", label: "Banners", icon: ImageIcon },
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
      { href: "/offers-review", label: "Brand Offers", icon: BadgePercent },
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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-64 shrink-0 bg-charcoal text-paper flex flex-col">
        <div className="px-6 py-7 border-b border-white/10 flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-md" />
          <div>
            <div className="font-display text-xl tracking-tight leading-none">{APP_NAME}</div>
            <div className="text-xs text-white/50 mt-0.5 font-mono">{APP_TAGLINE}</div>
          </div>
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
                    className={`flex items-center gap-2.5 px-6 py-2 text-sm border-l-2 transition-colors ${
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
          <div className="text-white/80">{user?.name}</div>
          <div className="text-white/40 mb-2">{user?.role}</div>
          <button onClick={logout} className="flex items-center gap-1 text-saffron hover:underline">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto fade-in">{children}</main>
    </div>
  );
}
