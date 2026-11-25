// Category names in this catalog are simple ASCII words ("Gemstone",
// "Vastu Products") so a plain kebab-case round-trips safely — no need for
// a real slug field, since a merged category has no single canonical
// document to hang a slug off anyway (see useCategoryStore's groupByName).
export function slugifyCategoryName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

// Best-effort reverse for a direct URL visit (no navigation state to read
// the real name from) — title-cases each word.
export function unslugifyCategoryName(slug) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
