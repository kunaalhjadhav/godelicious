// Sign in with a Firebase ID token: used for Google sign-in and Firebase phone verification.
// The token is checked here against Google's public keys, then the customer gets the same JWT
// as every other login. No extra packages needed.
//
// Render > backend > Environment:   FIREBASE_PROJECT_ID   (Firebase console > Project settings > Project ID)
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certCache = { certs: null, expires: 0 };

async function getCerts() {
  if (certCache.certs && Date.now() < certCache.expires) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error("Could not load Google's signing keys.");
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
  certCache = { certs: await res.json(), expires: Date.now() + (maxAge ? Number(maxAge[1]) : 3600) * 1000 };
  return certCache.certs;
}

async function verifyFirebaseToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header?.kid;
  const certs = await getCerts();
  if (!kid || !certs[kid]) throw new Error("Unknown signing key.");
  return jwt.verify(idToken, certs[kid], {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
}

const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);

// GET /api/auth/firebase/status
// google: on when FIREBASE_PROJECT_ID is set. apple: also needs FIREBASE_APPLE_ENABLED=1, set only
// after Sign in with Apple is configured in Firebase (Apple Services ID and key).
function status(req, res) {
  const enabled = Boolean(process.env.FIREBASE_PROJECT_ID);
  const apple = enabled && process.env.FIREBASE_APPLE_ENABLED === "1";
  res.json({ enabled, google: enabled, apple });
}

// POST /api/auth/firebase { idToken, name? }
async function login(req, res) {
  if (!process.env.FIREBASE_PROJECT_ID) return res.status(503).json({ error: "This sign-in method isn't available yet." });
  const idToken = String(req.body?.idToken || "");
  if (!idToken) return res.status(400).json({ error: "idToken is required." });

  let claims;
  try {
    claims = await verifyFirebaseToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: "Sign-in could not be verified. Please try again." });
  }

  const provider = claims.firebase?.sign_in_provider;
  let user;

  if (provider === "phone" && claims.phone_number) {
    const l10 = last10(claims.phone_number);
    user = await prisma.user.findFirst({ where: { phone: { endsWith: l10 }, role: "CUSTOMER" } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: req.body?.name || "Godelicious Customer",
          email: `${l10}@phone.godelicious.local`,
          phone: l10,
          passwordHash: crypto.randomBytes(32).toString("hex"),
          role: "CUSTOMER",
        },
      });
    }
  } else if ((provider === "google.com" || provider === "apple.com") && claims.email && claims.email_verified) {
    const email = String(claims.email).toLowerCase();
    user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (user && user.role !== "CUSTOMER") return res.status(403).json({ error: "This email belongs to a staff account. Use the staff sign-in." });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: claims.name || req.body?.name || email.split("@")[0],
          email,
          passwordHash: crypto.randomBytes(32).toString("hex"),
          role: "CUSTOMER",
        },
      });
    }
  } else {
    return res.status(400).json({ error: "This sign-in method isn't supported." });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, brandId: user.brandId } });
}

// Hand-off for the mobile apps: the app opens a web page with a random session id, the
// page signs the person in with Google/Apple and posts the result here, and the app
// collects it once. Held in memory for 5 minutes and handed over a single time.
const handoffs = new Map();
const SID_RE = /^[a-f0-9]{32}$/;

function sweep() {
  const now = Date.now();
  for (const [k, v] of handoffs) if (v.expires < now) handoffs.delete(k);
}

async function handoffPut(req, res) {
  const sid = String(req.body?.sid || "");
  if (!SID_RE.test(sid)) return res.status(400).json({ error: "Invalid session." });
  sweep();
  if (handoffs.size > 5000) return res.status(429).json({ error: "Please try again shortly." });
  let status = 200, body = null;
  const cap = {
    status(c) { status = c; return cap; },
    json(b) { body = b; return cap; },
  };
  await login(req, cap);
  if (status !== 200) return res.status(status).json(body);
  handoffs.set(sid, { data: body, expires: Date.now() + 5 * 60 * 1000 });
  res.json({ ok: true });
}

function handoffGet(req, res) {
  const sid = String(req.params.sid || "");
  if (!SID_RE.test(sid)) return res.status(400).json({ error: "Invalid session." });
  const h = handoffs.get(sid);
  if (!h || h.expires < Date.now()) return res.json({ ready: false });
  handoffs.delete(sid);
  res.json({ ready: true, ...h.data });
}

module.exports = { status, login, verifyFirebaseToken, handoffPut, handoffGet };
