"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    api.listNotifications().then((d) => setNotifications(d.notifications)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await api.createNotification(title, body);
      setTitle("");
      setBody("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Notifications</h1>
      <p className="text-sm text-ink/50 mb-6">
        Broadcast offers or announcements to every customer's in-app notification feed
      </p>

      <div className="bg-saffron/10 border-l-2 border-saffron2 px-4 py-3 mb-6 text-sm text-ink">
        This sends to customers' <strong>in-app</strong> notification feed (visible next time they
        open the app or site). It does not yet trigger a phone push/buzz while the app is closed —
        that requires a Firebase Cloud Messaging setup. See <code>DEPLOYMENT_GUIDE.md</code>.
      </div>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="bg-white border border-line rounded-sm p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-display text-lg">{n.title}</h3>
                <span className="text-xs text-ink/40">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-ink/70">{n.body}</p>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-sm text-ink/40">No notifications sent yet.</p>}
        </div>

        <form onSubmit={handleSend} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New broadcast</h2>
          <input
            placeholder="Title, e.g. 'Weekend offer!'" required value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <textarea
            placeholder="Message body" required value={body} rows={4}
            onChange={(e) => setBody(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button
            type="submit" disabled={sending}
            className="w-full bg-charcoal text-paper text-sm px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send to all customers"}
          </button>
        </form>
      </div>
    </Shell>
  );
}
