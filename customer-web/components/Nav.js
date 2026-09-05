"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Bell, Store, CalendarHeart, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { APP_NAME } from "@/lib/brand";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  const linkClass = (active) =>
    `flex items-center gap-1.5 transition-colors ${active ? "text-saffron" : "text-white/70 hover:text-white"}`;

  return (
    <header className="bg-charcoal/95 backdrop-blur text-paper sticky top-0 z-40 border-b border-white/5">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight shrink-0">
          <img src="/logo.svg" alt="" className="w-7 h-7 rounded-md" />
          {APP_NAME}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className={linkClass(pathname === "/")}>
            Menu
          </Link>
          <Link href="/brands" className={linkClass(pathname?.startsWith("/brands"))}>
            <Store size={15} /> Brand Partners
          </Link>
          <Link href="/venue-enquiry" className={linkClass(pathname?.startsWith("/venue-enquiry"))}>
            <CalendarHeart size={15} /> Venue enquiry
          </Link>
          {user && (
            <>
              <Link href="/orders" className={linkClass(pathname?.startsWith("/orders"))}>
                My orders
              </Link>
              <Link href="/notifications" className={linkClass(pathname?.startsWith("/notifications"))}>
                <Bell size={15} /> Notifications
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-white/90 hover:text-saffron transition-colors">
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-saffron text-charcoal text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <Link href="/profile" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                <User size={15} /> {user.name.split(" ")[0]}
              </Link>
              <button onClick={logout} className="flex items-center gap-1 text-saffron hover:underline">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-accent text-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
