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
