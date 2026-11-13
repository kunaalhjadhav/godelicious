"use client";

// Same layout and features as the Profile tab in the mobile app.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ChatWidget from "@/components/ChatWidget";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";
import { rupees } from "@/lib/pricing";
import { APP_NAME } from "@/lib/brand";
import { BUILD } from "@/lib/version";

function Row({ label, value, href, onClick, tone, last }) {
  const cls = `flex items-center justify-between px-4 py-3.5 text-sm ${last ? "" : "border-b border-[#EDE8DC]"} hover:bg-paper/60 transition-colors w-full text-left`;
  const inner = (
    <>
      <span className={tone || "text-ink"}>{label}</span>
      {value ? <span className="text-xs font-bold text-basil">{value}</span> : <span className="text-ink/30 text-lg leading-none">›</span>}
    </>
  );
  if (href) {
    return href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>;
  }
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [loyalty, setLoyalty] = useState(null);
  const [plans, setPlans] = useState([]);
  const [addrCount, setAddrCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const load = useCallback(() => {
    api.myLoyalty().then(setLoyalty).catch(() => {});
    api.mySubscriptions().then((d) => setPlans(d.subscriptions || [])).catch(() => {});
    api.myAddresses().then((d) => setAddrCount((d.addresses || []).length)).catch(() => {});
    api.myFavorites().then((d) => setFavCount((d.favorites || []).length)).catch(() => {});
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (loading || !user) return null;

  const shareText = loyalty
    ? `Order from ${APP_NAME} with my code ${loyalty.referralCode} and we both get Rs ${loyalty.referralBonusRupees} in reward points after your first delivery. https://godelicious.in`
    : "";

  async function share() {
    if (!loyalty) return;
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* share dismissed */ }
  }

  async function applyCode(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setMsg("");
    try {
      const r = await api.applyReferral(code.trim());
      setMsg(r.message || "Code applied.");
      setCode("");
      load();
    } catch (err) { setMsg(err.message); }
  }

  async function deleteAccount() {
    if (!confirm("Delete your account?\n\nYour profile, saved addresses, favourites, reward points and chat messages will be deleted. Past order and payment records are kept for tax purposes without your name or phone. This can't be undone.")) return;
    try {
      await api.deleteAccount();
      alert("Your account has been deleted.");
      logout();
    } catch (err) { alert(err.message); }
  }

  const activePlans = plans.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-10">
      <Nav />
      <div className="bg-charcoal">
        <div className="max-w-xl mx-auto px-5 py-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-saffron flex items-center justify-center shrink-0">
            <span className="font-display text-2xl text-charcoal">{user.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl text-paper truncate">{user.name}</h1>
            <p className="text-xs text-[#CFC9B8] truncate">{user.phone || user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-basil p-4">
            <div className="text-[10px] font-bold tracking-wider text-[#CFE2C8]">REWARD POINTS</div>
            <div className="text-3xl font-bold text-white mt-1">{loyalty ? loyalty.points : "-"}</div>
            <div className="text-xs text-[#CFE2C8] mt-0.5">{loyalty ? `Worth ${rupees(loyalty.rupeeValue)} off` : " "}</div>
          </div>
          <button onClick={share} className="rounded-2xl bg-white border border-line p-4 text-left hover:border-saffron2 transition-colors">
            <div className="text-[10px] font-bold tracking-wider text-ink/40">REFER A FRIEND</div>
            <div className="text-3xl font-bold text-saffron2 mt-1">{loyalty ? rupees(loyalty.referralBonusRupees) : "-"}</div>
            <div className="text-xs text-ink/50 mt-0.5">{copied ? "Copied. Paste it to a friend" : loyalty ? `Code ${loyalty.referralCode}. Tap to share` : " "}</div>
          </button>
        </div>
        {loyalty?.referredCount > 0 && (
          <p className="text-xs text-ink/40 text-center">{loyalty.referredCount} friend{loyalty.referredCount > 1 ? "s" : ""} joined with your code.</p>
        )}

        {loyalty && !loyalty.alreadyReferred && (
          <form onSubmit={applyCode} className="bg-white border border-line rounded-2xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink/40 mb-2.5">Have a friend's code?</div>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code"
                className="flex-1 border border-line rounded-lg px-3 py-2.5 text-sm uppercase" />
              <button className="bg-charcoal text-paper rounded-lg px-5 text-sm font-bold">Apply</button>
            </div>
            {msg && <p className="text-xs text-ink/60 mt-2">{msg}</p>}
          </form>
        )}

        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <Row label="My orders" href="/orders" />
          <Row label="Favourites" value={favCount ? String(favCount) : null} href="/favourites" />
          <Row label="Weekly meal box" value={activePlans ? "Active" : null} href="/weekly-box" />
          <Row label="Book a venue" href="/venues" />
          <Row label="My venue requests" href="/venues/requests" />
          <Row label="My venue enquiries" href="/my-enquiries" />
          <Row label="Saved addresses" value={addrCount ? String(addrCount) : null} href="/addresses" />
          <Row label="Notifications" href="/notifications" last />
        </div>

        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <Row label="Help & support (chat with us)" onClick={() => window.dispatchEvent(new Event("godelicious:open-chat"))} />
          <Row label="Cancellation & refund policy" href="/refund-policy" />
          <Row label="Privacy policy" href="/privacy" />
          <Row label="Terms" href="/terms" />
          <Row label="Log out" onClick={logout} tone="text-chili font-semibold" />
          <Row label="Delete my account" onClick={deleteAccount} tone="text-ink/40" last />
        </div>

        <p className="text-xs text-ink/40 text-center">Website version {BUILD}</p>
      </div>
      <ChatWidget hideButton />
    </div>
  );
}
