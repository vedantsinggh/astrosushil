export default function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2 flex-wrap"
    >
      <button
        type="button"
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="
          px-3 py-1.5 rounded-full cursor-pointer text-sm font-body text-black/60
          border border-black/12 bg-white hover:bg-black/5
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-all duration-700
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        "
        aria-label="Previous page"
      >
        Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === current ? "page" : undefined}
          className={`
            w-9 h-9 rounded-full cursor-pointer text-sm font-body font-medium
            border transition-all duration-700
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            ${
              p === current
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-black border-black/12 hover:bg-black/5"
            }
          `}
        >
          {p}
        </button>
      ))}

      {/* Next */}
      <button
        type="button"
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="
          px-3 py-1.5 rounded-full cursor-pointer text-sm font-body text-black
          border border-black/12 bg-white hover:bg-black/5
          disabled:opacity-30 disabled:cursor-not-allowed
          transition-all duration-700
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        "
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
