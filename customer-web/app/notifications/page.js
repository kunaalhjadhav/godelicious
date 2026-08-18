"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.myNotifications().then((d) => setNotifications(d.notifications)).catch(() => {});
  }, [user]);

  async function open(n) {
    if (!n.isRead) {
      await api.markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-6">Notifications</h1>

        {notifications.length === 0 ? (
          <p className="text-ink/50">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`w-full text-left p-4 rounded-sm border ${
                  n.isRead ? "bg-white border-line" : "bg-saffron/10 border-saffron2"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-display text-lg text-ink">{n.title}</h3>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-saffron2 shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-ink/70">{n.body}</p>
                <p className="text-xs text-ink/40 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
