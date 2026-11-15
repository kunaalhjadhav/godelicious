"use client";

// Swipeable photo strip with a full-screen viewer, plus the partner's video.
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

const full = (u) => (!u ? "" : u.startsWith("/") ? `${API_URL}${u}` : u);
function youTubeId(u) {
  const m = String(u).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
const isFileVideo = (u) => /\.(mp4|mov|webm)(\?|$)/i.test(u) || /\/video\/upload\//.test(u) || /\/api\/uploads\/file\//.test(u);

export default function MediaGallery({ photos = [], videoUrl, name = "" }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!photos.length && !videoUrl) return null;
  const yt = videoUrl ? youTubeId(videoUrl) : null;

  return (
    <div className="mb-5">
      {photos.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
            {photos.map((u, i) => (
              <button key={u} onClick={() => setOpen(i)}
                className={`snap-start shrink-0 rounded-sm overflow-hidden ${i === 0 ? "w-[85%] sm:w-[70%]" : "w-[60%] sm:w-[45%]"}`}>
                <img src={full(u)} alt={`${name} photo ${i + 1}`} loading={i > 1 ? "lazy" : "eager"} className="w-full h-52 sm:h-64 object-cover" />
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/40">{photos.length} photo{photos.length > 1 ? "s" : ""} · tap to view</p>
        </>
      )}

      {videoUrl && (
        <div className="mt-3">
          {yt ? (
            <div className="relative w-full overflow-hidden rounded-sm" style={{ paddingTop: "56.25%" }}>
              <iframe src={`https://www.youtube.com/embed/${yt}`} title={`${name} video`} allowFullScreen
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" className="absolute inset-0 w-full h-full" />
            </div>
          ) : isFileVideo(videoUrl) ? (
            <video src={full(videoUrl)} controls playsInline preload="metadata" className="w-full max-h-[420px] rounded-sm bg-black" />
          ) : (
            <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 bg-charcoal text-paper text-sm rounded-sm">▶ Watch video</a>
          )}
        </div>
      )}

      {open !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setOpen(null)}>
          <img src={full(photos[open])} alt="" className="max-w-[95vw] max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-3xl" aria-label="Close">×</button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} className="absolute left-2 text-white text-4xl px-3" aria-label="Previous">‹</button>
              <button onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} className="absolute right-2 text-white text-4xl px-3" aria-label="Next">›</button>
            </>
          )}
          <div className="absolute bottom-4 text-white/70 text-sm">{open + 1} / {photos.length}</div>
        </div>
      )}
    </div>
  );
}
