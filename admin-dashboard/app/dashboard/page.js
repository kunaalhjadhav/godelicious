"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-line rounded-sm p-5">
      <div className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">{label}</div>
      <div className={`font-display text-3xl ${accent || "text-ink"}`}>{value}</div>
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

      {error && <p className="text-chili text-sm">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Pending Orders" value={stats.pendingOrders} accent="text-saffron2" />
          <StatCard label="Orders Today" value={stats.todayOrders} />
          <StatCard label="Low Stock Items" value={stats.lowStockItems.length} accent="text-chili" />
          <StatCard label="Pending Enquiries" value={stats.pendingEnquiries} accent="text-saffron2" />
          <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toFixed(0)}`} accent="text-basil" />
        </div>
      )}

      {stats && stats.lowStockItems.length > 0 && (
        <div className="bg-white border border-line rounded-sm p-5">
          <h2 className="font-display text-lg text-ink mb-3">Low stock</h2>
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
