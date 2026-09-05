"use client";

import { useEffect, useState } from "react";
import { Clock, ShoppingBag, PackageX, CalendarHeart, TrendingUp, TriangleAlert } from "lucide-react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

function StatCard({ label, value, accent, icon: Icon }) {
  return (
    <div className="card-surface card-surface--interactive p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</div>
        {Icon && <Icon size={16} className={accent || "text-ink/30"} />}
      </div>
      <div className={`font-display text-3xl ${accent || "text-ink"}`}>{value}</div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card-surface p-5">
      <div className="h-3 w-20 skeleton mb-4" />
      <div className="h-8 w-14 skeleton" />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboardStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Overview</h1>
      <p className="text-sm text-ink/50 mb-6">Today at a glance</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats ? (
          <>
            <StatCard label="Pending Orders" value={stats.pendingOrders} accent="text-saffron2" icon={Clock} />
            <StatCard label="Orders Today" value={stats.todayOrders} icon={ShoppingBag} />
            <StatCard label="Low Stock Items" value={stats.lowStockItems.length} accent="text-chili" icon={PackageX} />
            <StatCard label="Pending Enquiries" value={stats.pendingEnquiries} accent="text-saffron2" icon={CalendarHeart} />
            <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toFixed(0)}`} accent="text-basil" icon={TrendingUp} />
          </>
        ) : (
          [...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)
        )}
      </div>

      {stats && stats.lowStockItems.length > 0 && (
        <div className="card-surface p-5 fade-in">
          <h2 className="font-display text-lg text-ink mb-3 flex items-center gap-2">
            <TriangleAlert size={18} className="text-chili" /> Low stock
          </h2>
          <ul className="text-sm divide-y divide-line">
            {stats.lowStockItems.map((item) => (
              <li key={item.id} className="py-2 flex justify-between">
                <span>{item.name}</span>
                <span className="font-mono text-chili">{item.stockQty} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}
