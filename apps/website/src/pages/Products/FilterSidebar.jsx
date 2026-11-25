function formatValue(n, unit) {
  if (unit === "₹") return `₹${Number(n).toLocaleString("en-IN")}`;
  return unit ? `${n} ${unit}` : String(n);
}

// Two overlapping native range inputs sharing one track — the classic
// no-library dual-thumb slider (see .range-thumb in index.css for the
// thumb/track styling). Fully controlled off `filters` state: dragging
// updates the parent's filter state directly on every tick, and the caller
// (CategoryListing) is responsible for debouncing the resulting fetch so a
// drag doesn't fire a request per pixel.
function RangeFilter({ title, unit, min, max, minValue, maxValue, onChange }) {
  if (min == null || max == null || min === max) return null;

  const safeMin = minValue ?? min;
  const safeMax = maxValue ?? max;
  const span = max - min || 1;
  const minPct = ((safeMin - min) / span) * 100;
  const maxPct = ((safeMax - min) / span) * 100;

  return (
    <div className="py-5 border-b border-black/8 flex flex-col gap-3">
      <span className="font-heading text-black text-sm">{title}</span>

      <div className="relative h-4 flex items-center">
        <div className="absolute left-0 right-0 h-1 rounded-full bg-black/10" />
        <div
          className="absolute h-1 rounded-full bg-primary"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={safeMin}
          // `safeMax - 1` is always a valid clamp ceiling here — the `|| min`
          // this used to fall back to treated a legitimate `0` result (when
          // safeMax === 1) as if the subtraction had failed, snapping the
          // min-thumb up to `min` instead of clamping it to 0.
          onChange={(e) => onChange(Math.min(Number(e.target.value), safeMax - 1), safeMax)}
          className="range-thumb absolute top-3 w-full appearance-none bg-transparent pointer-events-none"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={safeMax}
          onChange={(e) => onChange(safeMin, Math.max(Number(e.target.value), safeMin + 1))}
          className="range-thumb absolute top-3 w-full appearance-none bg-transparent pointer-events-none"
        />
      </div>

      <span className="text-black/50 text-xs font-body">
        {formatValue(safeMin, unit)} – {formatValue(safeMax, unit)}
      </span>
    </div>
  );
}

/**
 * Price/weight range filter sidebar. Only rendered for leaf categories —
 * subcategory browsing (the Gemstone -> Emerald/Ruby/... drill-down)
 * happens as its own card grid one level up, in CategoryListing, not
 * inside this sidebar.
 */
export default function FilterSidebar({ facets, filters, onFilterChange, onClearAll }) {
  const hasActiveFilters =
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.minWeight != null ||
    filters.maxWeight != null;

  return (
    <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <h3 className="font-heading text-primary text-lg mb-1">Filters</h3>

      <RangeFilter
        title="Price Range"
        unit="₹"
        min={facets?.price?.min}
        max={facets?.price?.max}
        minValue={filters.minPrice}
        maxValue={filters.maxPrice}
        onChange={(minPrice, maxPrice) =>
          onFilterChange({
            minPrice: minPrice === facets.price.min ? undefined : minPrice,
            maxPrice: maxPrice === facets.price.max ? undefined : maxPrice,
          })
        }
      />

      <RangeFilter
        title={`Weight Range${facets?.weightUnit ? ` (in ${facets.weightUnit})` : ""}`}
        unit={facets?.weightUnit}
        min={facets?.weight?.min}
        max={facets?.weight?.max}
        minValue={filters.minWeight}
        maxValue={filters.maxWeight}
        onChange={(minWeight, maxWeight) =>
          onFilterChange({
            minWeight: minWeight === facets.weight.min ? undefined : minWeight,
            maxWeight: maxWeight === facets.weight.max ? undefined : maxWeight,
          })
        }
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="mt-5 w-full px-4 py-2.5 rounded-xl border border-black/15 text-sm font-body text-black/70 hover:border-primary hover:text-primary transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </aside>
  );
}
