/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, X } from "lucide-react";
import { useSettingStore } from "../../store/usSettingStore"; // ← apna path

// ─── VideoModal (S3 mp4) ──────────────────────────────────────────────────────

function VideoModal({ url, title, onClose }) {
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
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <video
          src={url}
          title={title}
          controls
          autoPlay
          className="w-full aspect-video"
        />
      </motion.div>
    </motion.div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-xl animate-pulse">
      <div className="rounded-2xl aspect-video bg-black/10" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-3/4 bg-black/10 rounded" />
        <div className="h-3 w-full bg-black/8 rounded" />
        <div className="h-3 w-5/6 bg-black/8 rounded" />
        <div className="h-6 w-24 bg-black/8 rounded-full mt-1" />
      </div>
    </div>
  );
}

// ─── VideoCard ────────────────────────────────────────────────────────────────

function VideoCard({ item, delay }) {
  const [modalOpen, setModalOpen] = useState(false);

  // S3 mp4 → modal, YouTube → new tab
  const isS3 = item.mediaUrl && !item.mediaUrl.includes("youtube");
  const imgSrc = item.thumbnail || item.mediaUrl;

  const handlePlay = () => {
    if (isS3) setModalOpen(true);
    else window.open(item.mediaUrl, "_blank");
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: "easeOut", delay }}
        className="flex flex-col gap-4 group shadow-md rounded-xl"
      >
        {/* Thumbnail */}
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/10 shadow-md">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary/40 text-sm">No image</span>
            </div>
          )}

          {/* Hover overlay */}
          {/* <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" /> */}

          {/* Badge — tag ya personName */}
          {(item.tag?.trim() || item.personName?.trim()) && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-[10px] tracking-widest uppercase px-3 py-1 rounded-full">
              <span
                className="w-1.5 h-1.5 rounded-full bg-gold"
                aria-hidden="true"
              />
              {item.personName?.trim() || item.tag?.trim()}
            </span>
          )}

          {/* Play button */}
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play: ${item.title}`}
            className="
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-12 h-12 rounded-full bg-white/90 hover:bg-white
              flex items-center justify-center shadow-lg
              transition-all duration-200 hover:scale-110 active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
            "
          >
            <Play
              size={18}
              className="text-primary ml-0.5"
              fill="currentColor"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2 p-4">
          <h3 className="font-heading text-black text-lg sm:text-xl leading-snug line-clamp-2">
            {item.title}
          </h3>
          <p className="text-black/55 text-sm font-body leading-relaxed line-clamp-1">
            {item.description}
          </p>
          <button
            type="button"
            onClick={handlePlay}
            className="
              inline-flex items-center gap-1.5 mt-1 w-fit
              text-primary text-xs tracking-widest uppercase
              bg-secondary px-3 py-1.5 rounded-full font-body font-medium transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary
            "
          >
            <Clock size={12} aria-hidden="true" />
            Watch Now
          </button>
        </div>
      </motion.article>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <VideoModal
            url={item.mediaUrl}
            title={item.title}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function CelebritySection() {
  const { fetchMedia } = useSettingStore();
  const [celebrities, setCelebrities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchMedia({ section: "celebrity" });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setCelebrities(
        items.filter((m) => m.isActive).sort((a, b) => a.order - b.order),
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section
      aria-labelledby="celebrity-heading"
      className="relative w-full py-4 sm:py-6 lg:py-8 overflow-hidden"
    >
      <img
        src="/Image/bg.webp"
        alt="Background"
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={1920}
        height={600}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative flex flex-col items-center text-center gap-4 mb-12"
        >
          <h2
            id="celebrity-heading"
            className="text-primary text-3xl sm:text-4xl md:text-5xl leading-tight font-bold"
          >
            Stars Who Rely on <span className="text-gold">Astro Sushil's</span>{" "}
            <br className="hidden sm:block" />
            Guidance
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-black text-xl font-body"
          >
            Exclusive meetings with celebrities and spiritual leaders
          </motion.p>

          {/* <button
            className="hidden sm:block absolute bg-gold text-white top-0 right-0 rounded-full px-5 py-2 text-xs font-bold cursor-pointer tracking-wide shadow-lg"
            aria-label="View all"
          >
            View More
          </button> */}
          {/* <button
            className="sm:hidden rounded-full px-6 py-2.5 text-xs font-bold text-white bg-gold tracking-wide shadow-lg mt-1"
            aria-label="View all"
          >
            View More
          </button> */}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-6 sm:gap-8 lg:gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : celebrities.length === 0 ? (
          <p className="text-black/40 text-sm text-center py-10 font-body">
            No celebrity videos found.
          </p>
        ) : (
          <div
            className={`grid gap-6 ${
              celebrities.length === 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {celebrities.map((item, i) => (
              <VideoCard key={item._id} item={item} delay={i * 0.12} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
