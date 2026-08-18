const express = require("express");
const router = express.Router();
const { listUsers, createUser, updateUserRole } = require("../controllers/users.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("ADMIN"));

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id/role", updateUserRole);

module.exports = router;
