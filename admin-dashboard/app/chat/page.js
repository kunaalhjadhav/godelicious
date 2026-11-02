"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { speak, stopSpeaking, canSpeak } from "@/lib/speech";

// Listen / translate buttons under each message.
function MessageTools({ body, dark }) {
  const [tr, setTr] = useState(null);       // { text, to }
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const cls = `text-[11px] underline ${dark ? "text-paper/70" : "text-ink/50"} hover:opacity-80`;

  function say(text, lang) {
    setNote("");
    if (!speak(text, lang)) setNote(lang.startsWith("kn") ? "This computer has no Kannada voice installed. Add one in Windows Settings > Time & language > Speech." : "Voice not available here.");
  }
  async function translate(to) {
    setBusy(true); setNote("");
    try { setTr(await api.translateChat(body, to)); } catch (e) { setNote(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {canSpeak() && <button type="button" className={cls} onClick={() => say(body, "en-IN")}>Listen</button>}
        <button type="button" className={cls} disabled={busy} onClick={() => translate("kn")}>{busy ? "Translating…" : "ಕನ್ನಡ"}</button>
        <button type="button" className={cls} disabled={busy} onClick={() => translate("en")}>English</button>
        {canSpeak() && <button type="button" className={cls} onClick={stopSpeaking}>Stop</button>}
      </div>
      {tr && (
        <div className={`mt-1 pt-1 border-t ${dark ? "border-paper/20" : "border-line"}`}>
          <div>{tr.text}</div>
          {canSpeak() && <button type="button" className={cls} onClick={() => say(tr.text, tr.to === "kn" ? "kn-IN" : "en-IN")}>Listen to this</button>}
        </div>
      )}
      {note && <div className="text-[11px] text-chili mt-1">{note}</div>}
    </div>
  );
}

export default function ChatPage() {
  const [threads, setThreads] = useState([]);
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  function loadThreads() {
    api.listChatThreads().then((d) => setThreads(d.threads)).catch((e) => setError(e.message));
  }

  function loadThread(customerId) {
    api.getChatThread(customerId).then((d) => setMessages(d.messages)).catch((e) => setError(e.message));
  }

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 8000); // poll for new threads/unread counts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeCustomerId) return;
    loadThread(activeCustomerId);
    const interval = setInterval(() => loadThread(activeCustomerId), 4000); // poll active thread
    return () => clearInterval(interval);
  }, [activeCustomerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() || !activeCustomerId) return;
    setError("");
    try {
      await api.replyToThread(activeCustomerId, reply.trim());
      setReply("");
      loadThread(activeCustomerId);
      loadThreads();
    } catch (err) {
      setError(err.message);
    }
  }

  const activeThread = threads.find((t) => t.customerId === activeCustomerId);

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Chat</h1>
      <p className="text-sm text-ink/50 mb-6">Customer support conversations</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-4 h-[600px]">
        <div className="bg-white border border-line rounded-sm overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.customerId}
              onClick={() => setActiveCustomerId(t.customerId)}
              className={`w-full text-left px-4 py-3 border-b border-line hover:bg-paper ${
                activeCustomerId === t.customerId ? "bg-paper" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t.customerName}</span>
                {t.unreadCount > 0 && (
                  <span className="bg-chili text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {t.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink/50 truncate">{t.lastMessage?.body}</p>
            </button>
          ))}
          {threads.length === 0 && <p className="text-sm text-ink/40 p-4">No conversations yet.</p>}
        </div>

        <div className="col-span-2 bg-white border border-line rounded-sm flex flex-col">
          {!activeCustomerId ? (
            <div className="flex-1 flex items-center justify-center text-ink/40 text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-line font-medium text-sm">
                {activeThread?.customerName}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === "ADMIN" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-sm text-sm ${
                        m.senderRole === "ADMIN" ? "bg-charcoal text-paper" : "bg-paper border border-line text-ink"
                      }`}
                    >
                      {m.body}
                      <MessageTools body={m.body} dark={m.senderRole === "ADMIN"} />
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendReply} className="p-3 border-t border-line flex gap-2">
                <input
                  value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply…"
                  className="flex-1 px-3 py-2 border border-line rounded-sm text-sm"
                />
                <button type="submit" className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
