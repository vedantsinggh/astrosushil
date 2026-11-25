// Mirrors the backend's own stock semantics (astro-sushil-backend's
// order.controller.js: claimOneItemStock/reduceStock) — `stock` is the
// authoritative available count all the way down to the sub-variant level,
// and checkout genuinely fails once it's exhausted. So 0 here is a real
// "can't be purchased" signal, not just an unset/untracked field.

export function isVariantOutOfStock(variant) {
  if (!variant) return false;
  if (variant.subVariants?.length) {
    return variant.subVariants.every((sv) => (sv.stock ?? 0) <= 0);
  }
  return (variant.stock ?? 0) <= 0;
}

export function isProductOutOfStock({ stock, variants } = {}) {
  if (variants?.length) {
    return variants.every((v) => isVariantOutOfStock(v));
  }
  return (stock ?? 0) <= 0;
}
