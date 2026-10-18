"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, ClipboardList, Package, User } from "lucide-react";

// Bottom tab bar on phones, matching the app (Menu, Meal boxes, Orders, Profile). Hidden on desktop.
const TABS = [
  { href: "/", label: "Menu", icon: UtensilsCrossed, match: (p) => p === "/" || p.startsWith("/menu") },
  { href: "/meal-boxes", label: "Meal boxes", icon: Package, match: (p) => p.startsWith("/meal-boxes") },
  { href: "/orders", label: "Orders", icon: ClipboardList, match: (p) => p.startsWith("/orders") },
  { href: "/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/profile") },
];

export default function MobileTabs() {
  const pathname = usePathname() || "/";
  if (/^\/(login|register)/.test(pathname)) return null;
  return (
    <>
      <div className="md:hidden h-16" />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-charcoal text-paper border-t border-white/10 flex">
        {TABS.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 text-[11px] ${match(pathname) ? "text-saffron" : "text-white/70"}`}>
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
