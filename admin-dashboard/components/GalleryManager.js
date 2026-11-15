"use client";

// Photo gallery (up to 8) + one video, used by brand partners and venue partners.
// Every change is saved straight away through onSave({ gallery, videoUrl }).
import { useState } from "react";
import { api, API_URL } from "@/lib/api";

const MAX = 8;
const full = (u) => (!u ? "" : u.startsWith("/") ? `${API_URL}${u}` : u);
const isFileVideo = (u) => /\.(mp4|mov|webm)(\?|$)/i.test(u) || /\/video\/upload\//.test(u) || /\/api\/uploads\/file\//.test(u);

export default function GalleryManager({ gallery = [], videoUrl = "", onSave, title = "Photos & video" }) {
  const [photos, setPhotos] = useState(gallery);
  const [video, setVideo] = useState(videoUrl || "");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function persist(nextPhotos, nextVideo, note) {
    setMsg("");
    try {
      await onSave({ gallery: nextPhotos, videoUrl: nextVideo || null });
      setPhotos(nextPhotos); setVideo(nextVideo || "");
      setMsg(note || "Saved.");
    } catch (err) { setMsg(err.message); }
  }

  async function addPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = MAX - photos.length;
    if (room <= 0) return setMsg(`You already have ${MAX} photos. Remove one to add another.`);
    const take = files.slice(0, room);
    const urls = [];
    for (let i = 0; i < take.length; i += 1) {
      setBusy(`Uploading photo ${i + 1} of ${take.length}…`);
      try { const { url } = await api.uploadImage(take[i]); urls.push(url); }
      catch (err) { setMsg(`${take[i].name}: ${err.message}`); }
    }
    setBusy("");
    if (urls.length) {
      await persist([...photos, ...urls], video,
        files.length > room ? `Added ${urls.length}. Only ${MAX} photos are allowed, so the rest were skipped.` : `Added ${urls.length} photo${urls.length > 1 ? "s" : ""}.`);
    }
  }

  async function addVideoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setMsg("That video is over 25 MB. Trim it, or upload it to YouTube and paste the link.");
    setBusy("Uploading video… this can take a minute");
    try { const { url } = await api.uploadImage(file); await persist(photos, url, "Video added."); }
    catch (err) { setMsg(err.message); }
    finally { setBusy(""); }
  }

  const move = (i, d) => {
    const next = [...photos];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    persist(next, video);
  };

  return (
    <div className="bg-white border border-line rounded-sm p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="font-display text-lg">{title}</h2>
        <span className="text-xs font-mono text-ink/50">{photos.length}/{MAX} photos</span>
      </div>
      <p className="text-xs text-ink/50 mb-4">Customers see these on your page. The first photo is the cover. Use clear, bright photos.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 keep-cols">
        {photos.map((u, i) => (
          <div key={u} className="relative group rounded-sm overflow-hidden border border-line bg-paper">
            <img src={full(u)} alt={`Photo ${i + 1}`} className="w-full aspect-[4/3] object-cover" />
            {i === 0 && <span className="absolute top-1 left-1 text-[10px] font-bold bg-saffron text-charcoal px-1.5 py-0.5 rounded-sm">COVER</span>}
            <div className="flex justify-between items-center px-1.5 py-1 text-xs bg-white">
              <div className="flex gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="px-1.5 border border-line rounded-sm disabled:opacity-30" aria-label="Move left">‹</button>
                <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, 1)} className="px-1.5 border border-line rounded-sm disabled:opacity-30" aria-label="Move right">›</button>
              </div>
              <button type="button" onClick={() => confirm("Remove this photo?") && persist(photos.filter((x) => x !== u), video, "Photo removed.")} className="text-chili">Remove</button>
            </div>
          </div>
        ))}
        {photos.length < MAX && (
          <label className="flex flex-col items-center justify-center aspect-[4/3] border-2 border-dashed border-line rounded-sm cursor-pointer text-ink/50 hover:border-saffron2 hover:text-saffron2">
            <span className="text-3xl leading-none">+</span>
            <span className="text-xs mt-1 text-center px-2">Add photos<br />(pick up to {MAX - photos.length})</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} disabled={!!busy} />
          </label>
        )}
      </div>

      <h3 className="font-display text-base mt-6 mb-2">Video</h3>
      {video ? (
        <div className="space-y-2">
          {isFileVideo(video)
            ? <video src={full(video)} controls playsInline className="w-full max-w-md rounded-sm border border-line bg-black" />
            : <a href={video} target="_blank" rel="noreferrer" className="text-sm text-saffron2 break-all">{video}</a>}
          <div><button type="button" onClick={() => confirm("Remove the video?") && persist(photos, "", "Video removed.")} className="text-sm text-chili">Remove video</button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-paper text-sm rounded-sm cursor-pointer">
            Upload a video (up to 25 MB)
            <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" className="hidden" onChange={addVideoFile} disabled={!!busy} />
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="or paste a YouTube / Instagram link"
              className="flex-1 px-3 py-2 border border-line rounded-sm text-sm" />
            <button type="button" onClick={() => link.trim() && persist(photos, link.trim(), "Video link added.").then(() => setLink(""))}
              className="px-4 py-2 border border-line rounded-sm text-sm">Add link</button>
          </div>
          <p className="text-xs text-ink/40">A 20–60 second walk-through works best. Big files upload faster on Wi-Fi.</p>
        </div>
      )}

      {(busy || msg) && <p className={`text-sm mt-4 ${busy ? "text-saffron2" : "text-ink/70"}`}>{busy || msg}</p>}
    </div>
  );
}
