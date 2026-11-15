"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import GalleryManager from "@/components/GalleryManager";
import { api, API_URL } from "@/lib/api";

const full = (u) => (!u ? "" : u.startsWith("/") ? `${API_URL}${u}` : u);

export default function BrandProfilePage() {
  const [b, setB] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { api.brandProfile().then((d) => setB(d.brand)).catch((e) => setError(e.message)); }, []);

  async function save(e) {
    e.preventDefault();
    setError(""); setSaved(false);
    try {
      const r = await api.updateBrandProfile({ description: b.description, contactPhone: b.contactPhone, logoUrl: b.logoUrl });
      setB(r.brand); setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err) { setError(err.message); }
  }
  async function uploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const { url } = await api.uploadImage(file); setB((x) => ({ ...x, logoUrl: url })); }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  }

  if (!b) return <PartnerShell><p className="text-sm text-ink/50">{error || "Loading…"}</p></PartnerShell>;
  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Brand Page & Gallery</h1>
      <p className="text-sm text-ink/50 mb-6">This is what customers see when they open {b.name} in the Godelicious app and website.</p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <form onSubmit={save} className="bg-white border border-line rounded-sm p-4 sm:p-6 max-w-2xl mb-6">
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Logo</label>
        <div className="flex items-center gap-3 mb-4">
          {b.logoUrl ? <img src={full(b.logoUrl)} alt="" className="w-16 h-16 rounded-full object-cover border border-line" /> : <div className="w-16 h-16 rounded-full bg-line" />}
          <label className="text-sm px-3 py-1.5 border border-line rounded-sm cursor-pointer">
            {uploading ? "Uploading…" : "Change logo"}
            <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          </label>
        </div>
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">About your brand</label>
        <textarea rows={4} maxLength={2000} value={b.description || ""} onChange={(e) => setB({ ...b, description: e.target.value })}
          placeholder="Your story, speciality dishes, how long you've been cooking, veg / non-veg, etc."
          className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm" />
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Contact number</label>
        <input value={b.contactPhone || ""} onChange={(e) => setB({ ...b, contactPhone: e.target.value })} inputMode="tel"
          className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm" />
        <button className="bg-charcoal text-paper text-sm px-5 py-2 rounded-sm">Save</button>
        {saved && <span className="ml-3 text-sm text-basil">✓ Saved</span>}
      </form>

      <div className="max-w-2xl">
        <GalleryManager
          title="Food photos & video"
          gallery={b.gallery}
          videoUrl={b.videoUrl || ""}
          onSave={async (payload) => { const r = await api.updateBrandProfile(payload); setB((x) => ({ ...x, gallery: r.brand.gallery, videoUrl: r.brand.videoUrl })); }}
        />
      </div>
    </PartnerShell>
  );
}
