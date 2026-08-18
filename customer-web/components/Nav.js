"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useCart } from "@/lib/useCart";
import { APP_NAME } from "@/lib/brand";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="bg-charcoal text-paper sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
          <img src="/logo.svg" alt="" className="w-7 h-7 rounded-md" />
          {APP_NAME}
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="/" className={pathname === "/" ? "text-saffron" : "text-white/70 hover:text-white"}>
            Menu
          </Link>
          <Link
            href="/venue-enquiry"
            className={pathname?.startsWith("/venue-enquiry") ? "text-saffron" : "text-white/70 hover:text-white"}
          >
            Venue enquiry
          </Link>
          {user && (
            <>
              <Link
                href="/orders"
                className={pathname?.startsWith("/orders") ? "text-saffron" : "text-white/70 hover:text-white"}
              >
                My orders
              </Link>
              <Link
                href="/notifications"
                className={pathname?.startsWith("/notifications") ? "text-saffron" : "text-white/70 hover:text-white"}
              >
                Notifications
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-sm text-white/90 hover:text-saffron">
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-saffron text-charcoal text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <Link href="/profile" className="text-white/70 hover:text-white">
                {user.name.split(" ")[0]}
              </Link>
              <button onClick={logout} className="text-saffron hover:underline">
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm bg-saffron text-charcoal font-medium px-3 py-1.5 rounded-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
