"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TABS = [
  { key: "NEEDS_HUMAN", label: "Needs you" },
  { key: "HUMAN", label: "With you" },
  { key: "BOT", label: "Assistant" },
  { key: "CLOSED", label: "Closed" },
  { key: "", label: "All" },
];
const CH = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram" };
const badge = {
  NEEDS_HUMAN: "bg-chili/15 text-chili",
  HUMAN: "bg-saffron/20 text-saffron2",
  BOT: "bg-basil/15 text-basil",
  CLOSED: "bg-line text-ink/60",
};
const sideStyle = { CUSTOMER: "bg-white border border-line", BOT: "bg-basil/10", HUMAN: "bg-saffron/15" };
const senderLabel = { CUSTOMER: "Customer", BOT: "Assistant", HUMAN: "You" };

export default function ConversationsPage() {
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState("NEEDS_HUMAN");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  function loadList() {
    api.botConversations(tab).then((r) => setList(r.conversations)).catch((e) => setError(e.message));
  }
  function loadOne(id) {
    api.botConversation(id).then((r) => setOpen(r.conversation)).catch((e) => setError(e.message));
  }
  useEffect(() => { api.botStatus().then(setStatus).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    loadList();
    const t = setInterval(() => { loadList(); if (open) loadOne(open.id); }, 15000);
    return () => clearInterval(t);
  }, [tab, open?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [open?.messages?.length]);

  async function toggleBot() {
    setError("");
    try {
      const r = await api.botSetEnabled(!status.botEnabled);
      setStatus((s) => ({ ...s, botEnabled: r.botEnabled }));
    } catch (e) { setError(e.message); }
  }
  async function send() {
    if (!text.trim()) return;
    setBusy(true); setError("");
    try {
      await api.botReply(open.id, text.trim());
      setText("");
      loadOne(open.id); loadList();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function setConvoStatus(s) {
    try { await api.botSetStatus(open.id, s); loadOne(open.id); loadList(); } catch (e) { setError(e.message); }
  }

  const missing = status && [
    !status.aiReady && "ANTHROPIC_API_KEY",
    !status.webhookReady && "BOT_VERIFY_TOKEN and META_APP_SECRET",
    !status.whatsappReady && "WHATSAPP_TOKEN and WHATSAPP_PHONE_ID",
  ].filter(Boolean);

  return (
    <Shell>
      <div className="flex items-start justify-between mb-1">
        <h1 className="font-display text-2xl text-ink">Conversations</h1>
        {status && (
          <button
            onClick={toggleBot}
            className={`text-sm px-4 py-1.5 rounded-full border font-semibold ${status.botEnabled ? "border-basil bg-basil/10 text-basil" : "border-line bg-white text-ink/70"}`}
          >
            Assistant is {status.botEnabled ? "ON" : "OFF"}
          </button>
        )}
      </div>
      <p className="text-sm text-ink/50 mb-4">
        Customer messages from WhatsApp and Instagram. When the assistant is on it answers menu, price and order-status questions, and hands anything sensitive to you.
      </p>
      {missing && missing.length > 0 && (
        <div className="mb-4 text-sm bg-saffron/10 border-l-2 border-saffron px-3 py-2">
          Not fully connected yet. In Render (backend, Environment) add: <b>{missing.join("; ")}</b>.
        </div>
      )}
      {error && <p className="text-chili text-sm mb-3">{error}</p>}

      <div className="grid grid-cols-3 gap-6 items-start">
        <div>
          <div className="flex flex-wrap gap-1 mb-3">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setOpen(null); }}
                className={`text-sm px-3 py-1 rounded-full border ${tab === t.key ? "border-saffron2 bg-saffron/10 text-saffron2 font-semibold" : "border-line bg-white text-ink/70"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-ink/50">Nothing here.</p>}
            {list.map((c) => (
              <button key={c.id} onClick={() => loadOne(c.id)}
                className={`w-full text-left card-surface p-3 ${open?.id === c.id ? "ring-1 ring-saffron2" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-ink truncate">{c.contactName || c.contactId}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge[c.status]}`}>{c.status === "NEEDS_HUMAN" ? "Needs you" : c.status}</span>
                </div>
                <div className="text-xs text-ink/50">{CH[c.channel]} · {new Date(c.lastMessageAt).toLocaleString()}</div>
                <div className="text-xs text-ink/70 truncate mt-1">{c.messages?.[0]?.text}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 card-surface p-4">
          {!open && <p className="text-sm text-ink/50">Choose a conversation on the left.</p>}
          {open && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-display text-lg text-ink">{open.contactName || open.contactId}</div>
                  <div className="text-xs text-ink/50">{CH[open.channel]}{open.channel === "WHATSAPP" ? ` · +${open.contactId}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  {open.status !== "BOT" && <button onClick={() => setConvoStatus("BOT")} className="text-xs px-3 py-1 rounded-full border border-line bg-white">Give back to assistant</button>}
                  {open.status !== "CLOSED" && <button onClick={() => setConvoStatus("CLOSED")} className="text-xs px-3 py-1 rounded-full border border-line bg-white">Close</button>}
                </div>
              </div>
              {open.needsReason && <div className="text-sm bg-chili/10 border-l-2 border-chili px-3 py-1.5 mb-2">{open.needsReason}</div>}
              <div className="h-96 overflow-y-auto space-y-2 py-2">
                {open.messages.map((m) => (
                  <div key={m.id} className={m.sender === "CUSTOMER" ? "pr-12" : "pl-12"}>
                    <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${sideStyle[m.sender]}`}>
                      <div className="text-[10px] font-mono uppercase text-ink/50 mb-0.5">{senderLabel[m.sender]} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex gap-2 mt-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Type your reply" className="field-input flex-1" />
                <button onClick={send} disabled={busy || !text.trim()} className="btn-primary px-5 disabled:opacity-50">{busy ? "Sending" : "Send"}</button>
              </div>
              <p className="text-xs text-ink/40 mt-1">Once you reply, the assistant stays quiet in this chat until you give it back.</p>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
