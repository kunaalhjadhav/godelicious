"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  function load() {
    api.myMessages().then((d) => setMessages(d.messages)).catch(() => {});
  }

  useEffect(() => {
    if (!user || !open) return;
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    try {
      await api.sendMessage(body);
      load();
    } catch {
      // silently drop — chat isn't critical-path; a real send failure is rare here
    }
  }

  if (!user) return null; // support chat requires being signed in

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-5 w-80 max-w-[90vw] h-96 bg-white border border-line rounded-sm shadow-2xl flex flex-col z-50">
          <div className="bg-charcoal text-paper px-4 py-3 flex justify-between items-center rounded-t-sm">
            <span className="font-display text-sm">Chat with us</span>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-ink/40 text-center mt-4">
                Send us a message — our team usually replies within a few hours.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderRole === "CUSTOMER" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-sm text-sm ${
                    m.senderRole === "CUSTOMER" ? "bg-saffron text-charcoal" : "bg-paper border border-line text-ink"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="p-2 border-t border-line flex gap-2">
            <input
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 border border-line rounded-sm text-sm"
            />
            <button type="submit" className="bg-charcoal text-paper text-sm px-3 py-2 rounded-sm">
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full bg-charcoal text-saffron shadow-xl flex items-center justify-center text-2xl z-50"
        aria-label="Open chat"
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
