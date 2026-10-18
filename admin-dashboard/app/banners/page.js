"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

function resolveUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [mediaType, setMediaType] = useState("IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState({}); // banner ids whose picture failed to load
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    api.listAllBanners().then((d) => { setBanners(d.banners); setBroken({}); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);
  useEffect(() => {
    api.listMenu().then((d) => setMenuItems(d.items)).catch(() => {});
  }, []);

  function resetForm() {
    setEditingId(null); setMediaType("IMAGE"); setMediaUrl(""); setTitle(""); setLinkUrl("");
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
      e.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!mediaUrl) {
      setError("Upload a file or paste a media link first.");
      return;
    }
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await api.updateBanner(editingId, { mediaType, mediaUrl, title, linkUrl: linkUrl || null });
        setNotice("Banner saved. It shows in the app and website straight away.");
      } else {
        await api.createBanner({ mediaType, mediaUrl, title, linkUrl, sortOrder: banners.length });
        setNotice("Banner added. It is live in the app and on the website now.");
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(b) {
    setEditingId(b.id);
    setMediaType(b.mediaType);
    setMediaUrl(b.mediaUrl);
    setTitle(b.title || "");
    setLinkUrl(b.linkUrl || "");
    setError(""); setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(banner) {
    setError("");
    try {
      await api.updateBanner(banner.id, { isActive: !banner.isActive });
      load();
    } catch (err) { setError(err.message); }
  }

  async function remove(banner) {
    if (!confirm("Delete this banner?")) return;
    setError("");
    try {
      await api.deleteBanner(banner.id);
      if (editingId === banner.id) resetForm();
      load();
    } catch (err) { setError(err.message); }
  }

  // Swap places with the neighbour so the order really changes (banners can share a sort number)
  async function move(index, direction) {
    const other = banners[index + direction];
    if (!other) return;
    setError("");
    try {
      const list = banners.map((b, i) => ({ id: b.id, order: i }));
      const a = list[index], c = list[index + direction];
      [a.order, c.order] = [c.order, a.order];
      await Promise.all(list.map((x) => api.updateBanner(x.id, { sortOrder: x.order })));
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Banners</h1>
      <p className="text-sm text-ink/50 mb-6">
        The rotating carousel shown at the top of the customer app and website home screen
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {notice && <p className="text-basil text-sm mb-4">{notice}</p>}

      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 space-y-3">
          {banners.map((b, i) => (
            <div key={b.id} className={`card-surface p-3 flex items-center gap-3 ${editingId === b.id ? "ring-2 ring-saffron" : ""}`}>
              {b.mediaType === "IMAGE" ? (
                <img
                  src={resolveUrl(b.mediaUrl)} alt="" className="w-28 h-16 object-cover rounded-sm bg-line"
                  onError={() => setBroken((m) => ({ ...m, [b.id]: true }))}
                />
              ) : (
                <video
                  src={resolveUrl(b.mediaUrl)} className="w-28 h-16 object-cover rounded-sm bg-line" muted
                  onError={() => setBroken((m) => ({ ...m, [b.id]: true }))}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{b.title || "(no title)"}</div>
                <div className="text-xs text-ink/40 font-mono">{b.mediaType} · position {i + 1}</div>
                {broken[b.id] && (
                  <div className="text-xs text-chili mt-0.5">
                    This picture can't be loaded, so customers don't see it. Click Edit and upload it again.
                  </div>
                )}
              </div>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs px-2 py-1 border border-line rounded-sm disabled:opacity-30">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} className="text-xs px-2 py-1 border border-line rounded-sm disabled:opacity-30">↓</button>
              <button
                onClick={() => toggleActive(b)}
                className={`text-xs px-2 py-1 rounded-sm ${b.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                title={b.isActive ? "Click to hide from customers" : "Click to show to customers"}
              >
                {b.isActive ? "Live" : "Hidden"}
              </button>
              <button onClick={() => startEdit(b)} className="text-saffron2 text-xs hover:underline">Edit</button>
              <button onClick={() => remove(b)} className="text-chili text-xs hover:underline">Delete</button>
            </div>
          ))}
          {banners.length === 0 && <p className="text-sm text-ink/40">No banners yet.</p>}
        </div>

        <form onSubmit={handleSubmit} className="card-surface p-5 h-fit sticky top-4">
          <h2 className="font-display text-lg mb-3">{editingId ? "Edit banner" : "New banner"}</h2>

          <select
            value={mediaType} onChange={(e) => setMediaType(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          >
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
            Upload {mediaType === "VIDEO" ? "video" : "image"} {mediaType === "VIDEO" ? "(needs Cloudinary, or paste a link)" : "(best size 1200 × 600)"}
          </label>
          <input
            type="file" accept={mediaType === "VIDEO" ? "video/*" : "image/*"}
            onChange={handleFileUpload} disabled={uploading}
            className="w-full mb-2 text-xs"
          />
          {uploading && <p className="text-xs text-saffron2 mb-2">Uploading…</p>}
          {mediaUrl && mediaType === "IMAGE" && (
            <img src={resolveUrl(mediaUrl)} alt="" className="w-full h-28 object-cover rounded-sm mb-2 bg-line" />
          )}
          {mediaUrl && <p className="text-xs text-basil mb-2 font-mono break-all">✓ ready</p>}

          <p className="text-xs text-ink/40 mb-2 text-center">— or —</p>
          <input
            placeholder="Paste a media link instead" value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <input
            placeholder="Title (optional)" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <label className="field-label">Link to a menu item (optional)</label>
          <select
            value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm bg-white"
          >
            <option value="">No link — banner is just a visual</option>
            {menuItems.map((item) => (
              <option key={item.id} value={`/menu/${item.id}`}>{item.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="btn-primary text-sm flex-1">
              {editingId ? "Save banner" : "Add banner"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm px-4 py-2 border border-line rounded-sm">Cancel</button>
            )}
          </div>
        </form>
      </div>
    </Shell>
  );
}
