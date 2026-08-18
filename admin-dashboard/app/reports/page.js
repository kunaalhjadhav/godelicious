"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, getToken } from "@/lib/api";

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  function load() {
    api.salesReport(from, to).then(setReport).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  function applyFilter(e) {
    e.preventDefault();
    load();
  }

  // Auth-protected download: fetch as a blob with the token, then trigger
  // a browser save — a plain <a href> can't attach the Authorization header.
  async function downloadCsv() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(api.exportSalesCsvUrl(from, to), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `godelicious-sales-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Sales Report</h1>
          <p className="text-sm text-ink/50">Revenue, top sellers, and daily trend</p>
        </div>
        <button
          onClick={downloadCsv} disabled={exporting}
          className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <form onSubmit={applyFilter} className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-1.5 border border-line rounded-sm text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-1.5 border border-line rounded-sm text-sm bg-white" />
        </div>
        <button type="submit" className="px-4 py-1.5 border border-line rounded-sm text-sm bg-white">Filter</button>
      </form>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Revenue</div>
              <div className="font-display text-2xl text-basil">₹{report.summary.totalRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Orders</div>
              <div className="font-display text-2xl text-ink">{report.summary.orderCount}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Avg order value</div>
              <div className="font-display text-2xl text-ink">₹{report.summary.avgOrderValue.toFixed(0)}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Discounts given</div>
              <div className="font-display text-2xl text-chili">₹{report.summary.totalDiscount.toFixed(0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-line rounded-sm p-5">
              <h2 className="font-display text-lg mb-3">Top selling items</h2>
              <table className="w-full text-sm">
                <thead className="text-xs font-mono uppercase text-ink/50 text-left border-b border-line">
                  <tr><th className="py-2">Item</th><th className="py-2">Qty</th><th className="py-2">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {report.topItems.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 font-mono">{item.quantity}</td>
                      <td className="py-2 font-mono">₹{item.revenue.toFixed(0)}</td>
                    </tr>
                  ))}
                  {report.topItems.length === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-ink/40">No sales in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-line rounded-sm p-5">
              <h2 className="font-display text-lg mb-3">Daily revenue</h2>
              <div className="space-y-1.5">
                {report.dailyRevenue.map((d) => {
                  const max = Math.max(...report.dailyRevenue.map((x) => x.revenue), 1);
                  return (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink/50 w-20 shrink-0">{d.date}</span>
                      <div className="flex-1 bg-line rounded-sm h-4">
                        <div className="bg-saffron h-4 rounded-sm" style={{ width: `${(d.revenue / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono w-16 text-right">₹{d.revenue.toFixed(0)}</span>
                    </div>
                  );
                })}
                {report.dailyRevenue.length === 0 && <p className="text-sm text-ink/40">No data in this period.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
