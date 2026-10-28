"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const CHANNELS = [
  { key: "INSTAGRAM", label: "Instagram" },
  { key: "FACEBOOK", label: "Facebook" },
  { key: "GOOGLE", label: "Google Business" },
  { key: "YOUTUBE", label: "YouTube" },
  { key: "WHATSAPP", label: "WhatsApp" },
];
const KIND_LABEL = { POST: "Post", REEL: "Reel script", GOOGLE_POST: "Google post", SHORT: "Short script", BROADCAST: "Broadcast" };
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "APPROVED", label: "Approved" },
  { key: "POSTED", label: "Posted" },
];
const statusStyle = {
  DRAFT: "bg-line text-ink/70",
  APPROVED: "bg-saffron/20 text-saffron2",
  POSTED: "bg-basil/15 text-basil",
};


function ReportPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { api.marketingSources(days).then(setData).catch((e) => setErr(e.message)); }, [days]);
  async function write() {
    setBusy(true); setErr(""); setSummary("");
    try { const r = await api.marketingSummary(days); setSummary(r.summary); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card-surface p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg text-ink">Where orders come from</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="field-input w-auto">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </div>
      {err && <p className="text-chili text-sm mb-2">{err}</p>}
      {data && data.rows.length === 0 && <p className="text-sm text-ink/50">No orders in this period yet.</p>}
      {data && data.rows.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead><tr className="text-left text-xs font-mono uppercase text-ink/60"><th className="py-1">Source</th><th>Orders</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.source} className="border-t border-line"><td className="py-1.5">{r.label}</td><td>{r.orders}</td><td>₹{r.revenueRupees.toLocaleString("en-IN")}</td></tr>
            ))}
            <tr className="border-t border-line font-semibold"><td className="py-1.5">Total</td><td>{data.totalOrders}</td><td>₹{data.totalRevenueRupees.toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
      )}
      <p className="text-xs text-ink/50 mb-3">
        To track a channel, put a tagged link in its bio: godelicious.in/?ref=instagram, ?ref=google, ?ref=youtube or ?ref=whatsapp. Orders in the app show as Mobile app.
      </p>
      <button onClick={write} disabled={busy} className="btn-accent text-sm">{busy ? "Writing..." : "Write my weekly summary"}</button>
      {summary && <div className="mt-3 text-sm whitespace-pre-wrap bg-basil/10 rounded p-3">{summary}</div>}
    </div>
  );
}

function DraftCard({ draft, onChange, onRemove }) {
  const [title, setTitle] = useState(draft.title || "");
  const [body, setBody] = useState(draft.body);
  const [tags, setTags] = useState(draft.hashtags || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const dirty = title !== (draft.title || "") || body !== draft.body || tags !== (draft.hashtags || "");

  async function save(extra = {}) {
    setSaving(true);
    setMsg("");
    try {
      const { draft: d } = await api.updateMarketingDraft(draft.id, { title, body, hashtags: tags, ...extra });
      onChange(d);
      setMsg("Saved");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    const text = [body, tags].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied. Paste it into Instagram, Facebook, Google or YouTube.");
    } catch {
      setMsg("Couldn't copy automatically. Select the text and copy it.");
    }
  }

  const channel = CHANNELS.find((c) => c.key === draft.channel)?.label || draft.channel;

  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono uppercase tracking-wide text-ink/60">{channel} · {KIND_LABEL[draft.kind] || draft.kind}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusStyle[draft.status]}`}>{draft.status.toLowerCase()}</span>
        <span className="ml-auto text-xs text-ink/40">{new Date(draft.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Label" className="field-input mb-2 font-semibold" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(14, Math.max(5, body.split("\n").length + 1))} className="field-input mb-2" />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#hashtags" className="field-input mb-2 text-xs" />
      {draft.visualIdea && <p className="text-xs text-ink/60 mb-3"><span className="font-semibold">Photo or video idea:</span> {draft.visualIdea}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {dirty && <button onClick={() => save()} disabled={saving} className="btn-primary text-xs px-3 py-1.5">Save changes</button>}
        {draft.status === "DRAFT" && <button onClick={() => save({ status: "APPROVED" })} disabled={saving} className="btn-accent text-xs">Approve</button>}
        {draft.status === "APPROVED" && <button onClick={() => save({ status: "POSTED" })} disabled={saving} className="btn-accent text-xs">Mark as posted</button>}
        {draft.status !== "DRAFT" && <button onClick={() => save({ status: "DRAFT" })} disabled={saving} className="text-xs text-ink/50 hover:underline">Back to draft</button>}
        <button onClick={copy} className="text-xs text-saffron2 hover:underline">Copy text</button>
        <button onClick={onRemove} className="ml-auto text-xs text-chili hover:underline">Delete</button>
      </div>
      {msg && <p className="text-xs text-ink/60 mt-2">{msg}</p>}
    </div>
  );
}

export default function MarketingPage() {
  const [drafts, setDrafts] = useState([]);
  const [aiReady, setAiReady] = useState(true);
  const [tab, setTab] = useState("");
  const [channels, setChannels] = useState(["INSTAGRAM", "FACEBOOK", "GOOGLE", "YOUTUBE"]);
  const [count, setCount] = useState(7);
  const [language, setLanguage] = useState("en");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    api.listMarketingDrafts().then((d) => { setDrafts(d.drafts); setAiReady(d.aiReady); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  function toggle(key) {
    setChannels((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]));
  }

  async function generate() {
    setError(""); setNotice("");
    if (!channels.length) { setError("Choose at least one channel."); return; }
    setBusy(true);
    try {
      const { drafts: made } = await api.generateMarketing({ channels, count, language, focus });
      setDrafts((d) => [...made.slice().reverse(), ...d]);
      setTab("DRAFT");
      setNotice(`${made.length} new drafts are ready below. Read each one, edit it, then approve it.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(d) {
    if (!confirm("Delete this draft?")) return;
    try {
      await api.deleteMarketingDraft(d.id);
      setDrafts((all) => all.filter((x) => x.id !== d.id));
    } catch (e) { setError(e.message); }
  }

  const shown = tab ? drafts.filter((d) => d.status === tab) : drafts;

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">AI Marketing</h1>
      <p className="text-sm text-ink/50 mb-6">
        Drafts posts, Reel scripts and Google updates from your live menu and offers. Nothing is posted for you: you read, edit and approve each one, then paste it into the app.
      </p>

      {!aiReady && (
        <div className="mb-4 text-sm bg-saffron/10 border-l-2 border-saffron px-3 py-2">
          The AI isn't connected yet. In Render, open the backend service, then Environment, and add <b>ANTHROPIC_API_KEY</b> with your key.
        </div>
      )}
      <ReportPanel />
      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {notice && <p className="text-basil text-sm mb-4">{notice}</p>}

      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 space-y-3">
          <div className="flex gap-1 mb-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key} onClick={() => setTab(t.key)}
                className={`text-sm px-3 py-1 rounded-full border ${tab === t.key ? "border-saffron2 bg-saffron/10 text-saffron2 font-semibold" : "border-line bg-white text-ink/70"}`}
              >
                {t.label}{t.key ? ` (${drafts.filter((d) => d.status === t.key).length})` : ""}
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="text-sm text-ink/50">No drafts here yet. Use the panel on the right to create a batch.</p>}
          {shown.map((d) => (
            <DraftCard
              key={d.id + d.updatedAt} draft={d}
              onChange={(nd) => setDrafts((all) => all.map((x) => (x.id === nd.id ? nd : x)))}
              onRemove={() => remove(d)}
            />
          ))}
        </div>

        <div className="card-surface p-4 sticky top-4">
          <h2 className="font-display text-lg text-ink mb-3">Create a batch</h2>

          <div className="text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Channels</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CHANNELS.map((c) => (
              <button
                key={c.key} onClick={() => toggle(c.key)} type="button"
                className={`text-xs px-2.5 py-1 rounded-full border ${channels.includes(c.key) ? "border-saffron2 bg-saffron/10 text-saffron2 font-semibold" : "border-line bg-white text-ink/70"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">How many</label>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="field-input mb-3">
            {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} items</option>)}
          </select>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="field-input mb-3">
            <option value="en">English</option>
            <option value="kn">Kannada</option>
            <option value="both">English and Kannada</option>
          </select>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Focus (optional)</label>
          <textarea
            value={focus} onChange={(e) => setFocus(e.target.value)} rows={3}
            placeholder="For example: office lunch boxes this week, or Diwali party orders"
            className="field-input mb-3"
          />

          <button onClick={generate} disabled={busy} className="btn-primary w-full">
            {busy ? "Writing… this takes about 30 seconds" : "Generate drafts"}
          </button>
          <p className="text-xs text-ink/50 mt-3">
            It only uses your real menu, prices, offers and 20 km delivery area. If you use Kannada, ask a Kannada speaker to read it before posting.
          </p>
        </div>
      </div>
    </Shell>
  );
}
