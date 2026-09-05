"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [mediaType, setMediaType] = useState("IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.listAllBanners().then((d) => setBanners(d.banners)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  function resolveUrl(url) {
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await api.uploadImage(file);
      setMediaUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!mediaUrl) {
      setError("Upload a file or paste a media URL first.");
      return;
    }
    setError("");
    try {
      await api.createBanner({ mediaType, mediaUrl, title, linkUrl, sortOrder: banners.length });
      setMediaUrl("");
      setTitle("");
      setLinkUrl("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(banner) {
    await api.updateBanner(banner.id, { isActive: !banner.isActive });
    load();
  }

  async function remove(banner) {
    if (!confirm("Delete this banner?")) return;
    await api.deleteBanner(banner.id);
    load();
  }

  async function move(banner, direction) {
    const newOrder = banner.sortOrder + direction;
    await api.updateBanner(banner.id, { sortOrder: newOrder });
    load();
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Banners</h1>
      <p className="text-sm text-ink/50 mb-6">
        The rotating carousel shown at the top of the customer app and website home screen
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="card-surface p-3 flex items-center gap-3">
              {b.mediaType === "IMAGE" ? (
                <img src={resolveUrl(b.mediaUrl)} alt="" className="w-24 h-14 object-cover rounded-sm" />
              ) : (
                <video src={resolveUrl(b.mediaUrl)} className="w-24 h-14 object-cover rounded-sm" muted />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">{b.title || "(no title)"}</div>
                <div className="text-xs text-ink/40 font-mono">{b.mediaType} · order {b.sortOrder}</div>
              </div>
              <button onClick={() => move(b, -1)} className="text-xs px-2 py-1 border border-line rounded-sm">↑</button>
              <button onClick={() => move(b, 1)} className="text-xs px-2 py-1 border border-line rounded-sm">↓</button>
              <button
                onClick={() => toggleActive(b)}
                className={`text-xs px-2 py-1 rounded-sm ${b.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
              >
                {b.isActive ? "Live" : "Hidden"}
              </button>
              <button onClick={() => remove(b)} className="text-chili text-xs hover:underline">Delete</button>
            </div>
          ))}
          {banners.length === 0 && <p className="text-sm text-ink/40">No banners yet.</p>}
        </div>

        <form onSubmit={handleCreate} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New banner</h2>

          <select
            value={mediaType} onChange={(e) => setMediaType(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          >
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
            Upload {mediaType === "VIDEO" ? "video" : "image"} (max 25MB)
          </label>
          <input
            type="file" accept={mediaType === "VIDEO" ? "video/*" : "image/*"}
            onChange={handleFileUpload} disabled={uploading}
            className="w-full mb-2 text-xs"
          />
          {uploading && <p className="text-xs text-saffron2 mb-2">Uploading…</p>}
          {mediaUrl && <p className="text-xs text-basil mb-2 font-mono">✓ {mediaUrl}</p>}

          <p className="text-xs text-ink/40 mb-2 text-center">— or —</p>
          <input
            placeholder="Paste a media URL instead" value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <input
            placeholder="Title (optional)" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            placeholder="Link URL when tapped (optional)" value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <button type="submit" className="btn-primary text-sm w-full">
            Add banner
          </button>
        </form>
      </div>
    </Shell>
  );
}
