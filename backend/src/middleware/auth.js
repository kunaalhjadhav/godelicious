const { verifyToken } = require("../utils/jwt");

// Requires a valid Bearer token. Attaches decoded { id, role, email } to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated. Missing token." });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Restrict route to specific roles. Usage: requireRole("ADMIN", "STAFF")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized for this action." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
