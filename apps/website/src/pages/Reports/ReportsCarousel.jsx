import { Breadcrumb } from "@/components/HeroPage";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { REPORT_CATALOG_META } from "../../data/reportCatalogMeta";

const SLIDES = [...REPORT_CATALOG_META, ...REPORT_CATALOG_META];

export default function ReportsCarousel() {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const tick = () => {
      const wrap = wrapRef.current;
      const track = trackRef.current;
      if (!wrap || !track) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const wrapRect = wrap.getBoundingClientRect();
      const centerX = wrapRect.left + wrapRect.width / 2;
      const slides = track.querySelectorAll("[data-slide]");

      slides.forEach((slide) => {
        const r = slide.getBoundingClientRect();
        const slideCenter = r.left + r.width / 2;
        const dist = Math.abs(slideCenter - centerX);
        const norm = Math.max(0, 1 - dist / 280);
        const scale = (0.86 + norm * 0.18).toFixed(3);
        slide.style.transform = `scale(${scale})`;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <section
      className="pt-12 select-none relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(16,13,66,0.72), rgba(16,13,66,0.84)), url('/Image/reports-bg.webp')",
      }}
    >
      <div
        className="absolute inset-0 bg-linear-to-r from-[#100D42] via-[#100D42]/30 to-[#100D42] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
        <p className="text-[12px] uppercase tracking-[0.26em] text-gold/90 mb-2 font-body">
          13 Canonical Vedic &amp; Numerology Dossiers
        </p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Life Path &amp; <span className="text-gold">Destiny Reports</span>
        </h1>
        <p className="text-base md:text-lg tracking-normal max-w-3xl mx-auto text-white/85 mb-2">
          Discover detailed insights into your life journey, relationships,
          career, and planetary transits—crafted deterministically from your
          exact birth chart.
        </p>
      </div>

      <div ref={wrapRef} className="relative z-10 overflow-hidden py-8">
        <div
          ref={trackRef}
          className="flex gap-6 w-max items-center"
          style={{ animation: "scrollLeft 46s linear infinite" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.animationPlayState = "paused")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.animationPlayState = "running")
          }
        >
          {SLIDES.map((item, i) => (
            <button
              key={`${item.key}-${i}`}
              type="button"
              data-slide
              onClick={() =>
                navigate(`/personalized-astrology-reports/${item.slug}`)
              }
              className="group relative w-48 sm:w-52 aspect-210/297 shrink-0 rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-shadow duration-300 focus:outline-none"
              style={{
                border: `1.5px solid ${item.borderTint}`,
                boxShadow: `0 18px 36px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px ${item.softTint}`,
                background: item.jewelSurface,
              }}
              aria-label={`View ${item.title}`}
            >
              <img
                src={item.coverImage}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 pt-2.5 pb-4 px-2.5 text-center"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(10,8,28,0.72) 0%, rgba(10,8,28,0) 100%)",
                }}
              >
                <span
                  className="block text-[9px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: item.accent }}
                >
                  Astro Sushil
                </span>
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left opacity-100"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(10,8,28,0) 0%, rgba(10,8,28,0.88) 55%)",
                }}
              >
                <span
                  className="inline-block text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold mb-1"
                  style={{
                    backgroundColor: `${item.accent}24`,
                    color: item.accent,
                    border: `1px solid ${item.accent}55`,
                  }}
                >
                  {item.badgeLabel}
                </span>
                <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                  {item.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="relative z-10 max-w-7xl mx-auto md:px-5">
        <div className="relative px-3 left-0 right-0 bottom-0 pr-10 bg-white/5 rounded-tr-3xl py-3 backdrop-blur-sm max-w-max">
          <Breadcrumb
            crumbs={[
              { label: "Home", href: "/" },
              { label: "Reports", href: "/personalized-astrology-reports" },
            ]}
          />
        </div>
      </div>

      <style>{`
        @keyframes scrollLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
