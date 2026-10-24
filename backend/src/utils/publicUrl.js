// Files uploaded through the admin are served by this backend at /api/uploads/file/<id>.
// The full link used to be saved in the database with whatever host the server had at the time
// (for example the old Railway address), so after moving hosts every banner / dish / category
// picture pointed at a dead server and showed as a broken image.
//
// This middleware rewrites those links on the way out, so they always point at THIS server
// (PUBLIC_API_URL if set, otherwise the address the request came in on). Nothing in the
// database has to change.
function publicBase(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/+$/, "");
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  return `${proto}://${req.get("host")}`;
}

function rewriteUploadUrls(req, res, next) {
  const original = res.json.bind(res);
  res.json = (body) => {
    try {
      const text = JSON.stringify(body);
      if (typeof text === "string" && text.includes("/api/uploads/file/")) {
        const base = publicBase(req);
        const fixed = text
          .replace(/https?:\/\/[^"\\\s\/]+\/api\/uploads\/file\//g, `${base}/api/uploads/file/`)
          .replace(/"\/api\/uploads\/file\//g, `"${base}/api/uploads/file/`);
        res.set("Content-Type", "application/json; charset=utf-8");
        return res.send(fixed);
      }
    } catch (_) {
      /* fall through to the normal response */
    }
    return original(body);
  };
  next();
}

module.exports = { rewriteUploadUrls, publicBase };
