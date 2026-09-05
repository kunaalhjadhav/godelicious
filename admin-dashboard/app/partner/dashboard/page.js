"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

export default function PartnerDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.myBrandDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Dashboard</h1>
      <p className="text-sm text-ink/50 mb-6">Overview of your brand on this platform</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      {data && (
        <>
          {!data.brand.isApproved && (
            <div className="bg-saffron/10 border-l-2 border-saffron2 px-4 py-3 mb-6 text-sm text-ink">
              Your brand is <strong>pending admin approval</strong>. You can set up your menu,
              locations, and offers now — customers will see them as soon as an admin approves
              your account.
            </div>
          )}
          {!data.brand.isActive && data.brand.isApproved && (
            <div className="bg-chili/10 border-l-2 border-chili px-4 py-3 mb-6 text-sm text-ink">
              Your brand is currently <strong>disabled</strong> by an admin and hidden from customers.
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Menu items</div>
              <div className="font-display text-2xl text-ink">{data.menuItemCount}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Active orders</div>
              <div className="font-display text-2xl text-saffron2">{data.pendingOrdersCount}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Total sales</div>
              <div className="font-display text-2xl text-basil">₹{data.totalSales.toFixed(0)}</div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-sm p-5">
            <h2 className="font-display text-lg mb-2">Your commission rate</h2>
            <p className="text-sm text-ink/60">
              {data.brand.commissionPercent}% is retained by the platform on each sale; the rest is
              your payout, tracked on the Earnings page.
            </p>
          </div>
        </>
      )}
    </PartnerShell>
  );
}
