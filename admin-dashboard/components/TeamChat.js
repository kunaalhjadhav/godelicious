"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Partner <-> Godelicious team chat (brand and venue partners). Messages also reach the company WhatsApp number.
export default function TeamChat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  function load() {
    api.myChat().then((d) => setMessages(d.messages || [])).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // check for replies every 10 seconds
    return () => clearInterval(t);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true); setError("");
    try {
      await api.sendMyChat(text.trim());
      setText("");
      load();
    } catch (err) { setError(err.message); } finally { setSending(false); }
  }

  return (
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl text-ink mb-1">Chat with Godelicious</h1>
        <p className="text-sm text-ink/50 mb-6">Questions about orders, menu approvals, payouts or anything else. The team usually replies within a few hours.</p>

        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <div className="bg-white border border-line rounded-sm p-4 h-[28rem] overflow-y-auto space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-ink/40 text-center mt-16">No messages yet. Write to the Godelicious team below.</p>
          )}
          {messages.map((m) => {
            const mine = m.senderRole !== "ADMIN";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-sm text-sm ${mine ? "bg-charcoal text-paper" : "bg-paper border border-line text-ink"}`}>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-paper/60" : "text-ink/40"}`}>
                    {mine ? "You" : "Godelicious"} · {new Date(m.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 mt-3">
          <input
            value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
            placeholder="Type a message…" className="flex-1 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button type="submit" disabled={sending || !text.trim()} className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm disabled:opacity-50">
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
  );
}
