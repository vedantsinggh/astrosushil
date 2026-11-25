import { Breadcrumb } from "@/components/HeroPage";
import { useEffect, useRef } from "react";

const REPORTS = [
  { img: "/Image/Reports/match-making.webp" },
  { img: "/Image/Reports/basic-horscope.webp" },
  { img: "/Image/Reports/mini-horscope.webp" },
  { img: "/Image/Reports/pro-horscope.webp" },
];

const DOUBLED = [...REPORTS, ...REPORTS, ...REPORTS, ...REPORTS];

export default function ReportsCarousel() {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);

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

      let bestDist = Infinity;

      slides.forEach((slide) => {
        const r = slide.getBoundingClientRect();
        const slideCenter = r.left + r.width / 2;
        const dist = Math.abs(slideCenter - centerX);
        const norm = Math.max(0, 1 - dist / 260);
        const scale = (0.82 + norm * 0.31).toFixed(3);
        // const opacity = (0.58 + norm * 0.42).toFixed(3);
        slide.style.transform = `scale(${scale})`;
        // slide.style.opacity = opacity;

        if (dist < bestDist) {
          bestDist = dist;
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <section
      className="pt-10 select-none relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/Image/reports-bg.webp')",
        zIndex: -1,
      }}
    >
      <div
        className="absolute inset-0 bg-linear-to-r from-[#100D42] via-[#100D42]/20 to-[#100D42] -z-1"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-linear-to-l from-[#100D42] via-[#100D42]/20 to-[#100D42] -z-1"
        aria-hidden="true"
      />
      <h2 className="text-center text-4xl  font-bold text-white mb-6">
        Life Path & <span className="text-gold">Destiny Reports</span>
      </h2>
      <p className="text-center  text-lg  tracking-normal  max-w-4xl mx-auto text-white mb-1">
        Discover detailed insights into your life journey and true purpose
        through personalized astrological analysis.Understand your strengths,
        challenges, and future possibilities guided by planetary influences.
      </p>

      <div
        ref={wrapRef}
        className="overflow-hidden relative py-8"
        // style={{
        //   maskImage:
        //     "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
        //   WebkitMaskImage:
        //     "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
        // }}
      >
        <div
          ref={trackRef}
          className="flex gap-5 w-max"
          style={{ animation: "scrollLeft 20s linear infinite" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.animationPlayState = "paused")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.animationPlayState = "running")
          }
        >
          {DOUBLED.map((r, i) => (
            <div
              key={i}
              data-slide
              data-title={r.title}
              data-badge={r.badge}
              className="relative w-64 h-full shrink-0 rounded-xl overflow-hidden cursor-pointer"
              // style={{
              //   transition:
              //     "transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
              //   transform: "scale(0.82)",
              // }}
            >
              <img
                src="/Image/card-frame-golden.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full p-1"
              />
              <img
                src={r.img}
                alt={r.title}
                className="absolute inset-0 w-full h-full object-contain p-6"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto md:px-5">
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
