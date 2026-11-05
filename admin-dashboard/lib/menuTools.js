// Helpers shared by the Menu and Inventory pages.
export function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9ಀ-೿ ]/g, " ").replace(/\s+/g, " ").trim();
}

// Ids of items that share a name with another item in the same category
export function duplicateIds(items, getCategory = (i) => i.categoryId || i.category?.name) {
  const seen = {};
  for (const i of items) {
    const key = `${normalizeName(i.name)}|${getCategory(i)}`;
    (seen[key] ||= []).push(i.id);
  }
  const ids = new Set();
  Object.values(seen).forEach((list) => { if (list.length > 1) list.forEach((id) => ids.add(id)); });
  return ids;
}

// Plain-text match on name, food code and category
export function matchesSearch(item, q) {
  const term = String(q || "").trim().toLowerCase();
  if (!term) return true;
  return [item.name, item.foodCode, item.category?.name].some((v) => String(v || "").toLowerCase().includes(term));
}

// ---------- sorting ----------
export const SORT_OPTIONS = [
  { value: "code-asc", label: "Code: low to high" },
  { value: "code-desc", label: "Code: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "category", label: "Category, then code" },
  { value: "stock-asc", label: "Stock: lowest first" },
];

// "GD-0012" -> 12. Items without a code go to the end.
function codeNumber(item) {
  const m = String(item.foodCode || "").match(/(\d+)\s*$/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

export function sortItems(list, sort) {
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
  const byCode = (a, b) => codeNumber(a) - codeNumber(b) || byName(a, b);
  const cmp = {
    "code-asc": byCode,
    "code-desc": (a, b) => {
      const ca = codeNumber(a), cb = codeNumber(b);
      if (ca === cb) return byName(a, b);
      if (!Number.isFinite(ca)) return 1;  // no code: still last
      if (!Number.isFinite(cb)) return -1;
      return cb - ca;
    },
    "name-asc": byName,
    category: (a, b) => String(a.category?.name || "").localeCompare(String(b.category?.name || "")) || byCode(a, b),
    "stock-asc": (a, b) => (Number(a.stockQty) || 0) - (Number(b.stockQty) || 0) || byCode(a, b),
  }[sort] || byCode;
  return [...list].sort(cmp);
}

// Remembers the chosen sort per page in this browser.
export function loadSort(page) {
  try { return localStorage.getItem(`gd-sort-${page}`) || "code-asc"; } catch { return "code-asc"; }
}
export function saveSort(page, value) {
  try { localStorage.setItem(`gd-sort-${page}`, value); } catch {}
}
