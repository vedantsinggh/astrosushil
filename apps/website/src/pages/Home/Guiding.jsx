/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useSettingStore } from "../../store/usSettingStore"; // ← apna path

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function getVisible(w) {
  if (w >= 1024) return 3;
  if (w >= 640) return 2;
  return 1;
}

// ─── ArrowBtn ─────────────────────────────────────────────────────────────────

function ArrowBtn({ direction, onClick, disabled }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous" : "Next"}
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      className={[
        "absolute top-1/2 -translate-y-1/2 z-20",
        "w-9 h-9 rounded-full flex items-center justify-center",
        "border shadow-lg transition-colors duration-200",
        direction === "left" ? "-left-4 sm:-left-10" : "-right-4 sm:-right-10",
        disabled
          ? "border-white/10 text-white/20 bg-black/20 cursor-not-allowed"
          : "border-white/30 text-white bg-black/40 hover:bg-black/60 cursor-pointer",
      ].join(" ")}
    >
      {direction === "left" ? (
        <ChevronLeft size={18} />
      ) : (
        <ChevronRight size={18} />
      )}
    </motion.button>
  );
}

// ─── ImageLightbox ────────────────────────────────────────────────────────────

function ImageLightbox({ src, title, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <img
          src={src}
          alt={title}
          className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]"
        />
        {title && (
          <p className="text-white/70 text-sm text-center mt-3 font-body">
            {title}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── WishesCard ───────────────────────────────────────────────────────────────

function WishesCard({ item }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // type=image, thumbnail="" → mediaUrl is the actual image
  const imgSrc = item.thumbnail || item.mediaUrl;

  return (
    <>
      <article
        // onClick={() => setLightboxOpen(true)}
        className="bg-white/5 backdrop-blur rounded-2xl overflow-hidden flex flex-col w-full shadow-lg select-none h-full group cursor-pointer border border-white/10"
      >
        {/* Image */}
        <div className="aspect-video w-full overflow-hidden relative shrink-0">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={item.personName || item.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover bg-white transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary/40 text-sm">No image</span>
            </div>
          )}
          {/* Hover overlay */}
          {/* <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white text-xs tracking-widest uppercase font-body bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              View
            </span>
          </div> */}
        </div>

        {/* Text */}
        <div className="p-5 flex flex-col gap-1.5 flex-1">
          {item.personName?.trim() && (
            <span className="text-[10px] tracking-widest uppercase text-gold font-body font-medium">
              {item.personName.trim()}
            </span>
          )}
          <h3 className="text-white font-bold text-lg font-body leading-snug">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-white/70 text-sm sm:text-base leading-relaxed line-clamp-3">
              {item.description}
            </p>
          )}
        </div>
      </article>

      <AnimatePresence>
        {lightboxOpen && (
          <ImageLightbox
            src={imgSrc}
            title={item.personName || item.title}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse h-full">
      <div className="aspect-video w-full bg-black/10" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-3 w-1/3 bg-black/8 rounded" />
        <div className="h-4 w-3/4 bg-black/10 rounded" />
        <div className="h-3 w-full bg-black/8 rounded" />
      </div>
    </div>
  );
}

function GuidingSlider({ items, loading }) {
  const width = useWindowWidth();
  const visibleCount = getVisible(width);
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const touchStart = useRef(0);

  const maxIndex = Math.max(0, items.length - visibleCount);

  useEffect(() => {
    setCurrent(0);
  }, [items.length]);

  const go = (step) => {
    const next = Math.max(0, Math.min(maxIndex, current + step));
    if (next === current) return;
    setDir(step > 0 ? 1 : -1);
    setCurrent(next);
  };

  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) go(delta > 0 ? 1 : -1);
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? "55%" : "-55%", opacity: 0, scale: 0.94 }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 240, damping: 26, mass: 0.9 },
    },
    exit: (d) => ({
      x: d > 0 ? "-30%" : "30%",
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.28, ease: "easeIn" },
    }),
  };

  if (loading) {
    return (
      <div className="px-6">
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: visibleCount }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-white/50 text-sm text-center py-10 font-body">
        No wishes found.
      </p>
    );
  }

  const visibleItems = items.slice(current, current + visibleCount);

  return (
    <div className="relative px-2">
      <ArrowBtn
        direction="left"
        onClick={() => go(-1)}
        disabled={current === 0}
      />

      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={current}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid gap-5 items-stretch"
            style={{
              gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
            }}
          >
            {visibleItems.map((item, i) => (
              <div key={item._id || i} className="h-full">
                <WishesCard item={item} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <ArrowBtn
        direction="right"
        onClick={() => go(1)}
        disabled={current >= maxIndex}
      />

      {/* Dots */}
      {maxIndex > 0 && (
        <div
          className="flex justify-center items-center gap-2 mt-8"
          role="tablist"
          aria-label="Carousel navigation"
        >
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <motion.button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                setDir(i > current ? 1 : -1);
                setCurrent(i);
              }}
              animate={{
                width: i === current ? 24 : 8,
                opacity: i === current ? 1 : 0.4,
                backgroundColor: i === current ? "#d4af37" : "#ffffff",
              }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuidingCarousel({
  bgImage = "/Image/ProductBgNew.webp",
}) {
  const { fetchMedia } = useSettingStore();
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchMedia({ section: "wishes" });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setWishes(
        items.filter((m) => m.isActive).sort((a, b) => a.order - b.order),
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-label="Guiding You section"
    >
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={1920}
        height={800}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <img
        src="/Image/paper.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute top-0 w-full z-10 object-cover"
      />

      <img
        src="/Image/paper.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute bottom-0 w-full z-10 object-cover rotate-180"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-white md:text-5xl font-bold leading-tight">
            Astro Sushil – <span className="text-gold">Guiding You</span> Across
            the World
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          <GuidingSlider items={wishes} loading={loading} />
        </motion.div>
      </div>
    </section>
  );
}
