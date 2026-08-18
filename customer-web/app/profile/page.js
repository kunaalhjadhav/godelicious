"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-saffron flex items-center justify-center mx-auto mb-4">
          <span className="font-display text-2xl text-charcoal">{user.name.charAt(0).toUpperCase()}</span>
        </div>
        <h1 className="font-display text-xl text-ink">{user.name}</h1>
        <p className="text-sm text-ink/50">{user.email}</p>
        {user.phone && <p className="text-sm text-ink/50">{user.phone}</p>}

        <div className="mt-8 space-y-2 text-sm">
          <Link href="/orders" className="block text-saffron2 hover:underline">My orders</Link>
          <Link href="/my-enquiries" className="block text-saffron2 hover:underline">My venue enquiries</Link>
        </div>

        <button
          onClick={logout}
          className="mt-8 border border-chili text-chili px-5 py-2 rounded-sm text-sm font-medium hover:bg-chili/5"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
