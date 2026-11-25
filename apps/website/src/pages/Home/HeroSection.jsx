/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react";
import { useSettingStore } from "../../store/usSettingStore";
import { Link } from "react-router-dom";

const AUTO_PLAY_INTERVAL = 5000;

if (typeof document !== "undefined" && !document.getElementById("hero-css")) {
  const style = document.createElement("style");
  style.id = "hero-css";
  style.textContent = `
@keyframes slideEnterRight { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideEnterLeft  { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
@keyframes imgEnterRight   { from { opacity: 0; transform: translateX(80px); } to { opacity: 1; transform: translateX(0); } }
@keyframes imgEnterLeft    { from { opacity: 0; transform: translateX(-80px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeSlide       { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.slide-enter-right { animation: slideEnterRight 0.6s ease-out both; }
.slide-enter-left  { animation: slideEnterLeft  0.6s ease-out both; }
.img-enter-right   { animation: imgEnterRight   0.8s ease-out both; }
.img-enter-left    { animation: imgEnterLeft    0.8s ease-out both; }
.animate-fadeSlide { animation: fadeSlide       0.5s ease-out both; }
`;
  document.head.appendChild(style);
}

function preloadBannerImages(banners) {
  banners.slice(0, 1).forEach((b) => {
    if (b?.image) {
      const img = new window.Image();
      img.src = b.image;
    }
  });
}

const formatHeading = (subtitle) => {
  if (!subtitle) return null;
  const words = subtitle.split(" ");
  const secondLine = words.splice(-2).join(" ");
  return (
    <>
      <span>{words.join(" ")}</span>{" "}
      <span className="text-gold">{secondLine}</span>
    </>
  );
};

function DesktopHero({ banners }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    preloadBannerImages(banners);
  }, [banners]);

  const goTo = useCallback((index, dir) => {
    setDirection(dir);
    setCurrent(index);
    setAnimKey((k) => k + 1);
  }, []);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % banners.length);
    setAnimKey((k) => k + 1);
  }, [banners.length]);

  useEffect(() => {
    timerRef.current = setInterval(next, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [next]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const play = () => {
      video.load();
      video.play().catch(() => {});
    };
    if (document.readyState === "complete") {
      const id = setTimeout(play, 200);
      return () => clearTimeout(id);
    }
    window.addEventListener("load", play, { once: true });
    return () => window.removeEventListener("load", play);
  }, []);

  const pauseAuto = () => clearInterval(timerRef.current);
  const resumeAuto = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_PLAY_INTERVAL);
  };

  const slide = banners[current];
  const textClass = direction > 0 ? "slide-enter-right" : "slide-enter-left";
  const imgClass = direction > 0 ? "img-enter-right" : "img-enter-left";

  return (
    <section
      aria-label="Hero section — Astro Sushil personalized astrology"
      className="relative w-full min-h-[75vh] overflow-hidden flex flex-col"
      onMouseEnter={pauseAuto}
      onMouseLeave={resumeAuto}
    >
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="none"
          poster="/Image/hero.webp"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://astro-sushil.s3.ap-southeast-2.amazonaws.com/videos/slider.webm"
            type="video/webm"
          />
        </video>
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, #100D42, #100D4200)",
          }}
        />
      </div>

      <div className="relative z-10 px-5 md:px-10 flex-1 flex items-center w-full">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 gap-10 w-full items-center h-full">
          <div key={`text-${animKey}`} className={`space-y-6 ${textClass}`}>
            <p className="text-white/80 text-xl tracking-wide">
              {slide?.title}
            </p>
            <h1 className="text-white leading-tight text-[45px] font-semibold max-w-2xl">
              {formatHeading(slide?.subtitle)}
            </h1>
            <p className="text-white/85 text-lg leading-relaxed max-w-2xl">
              {slide?.description}
            </p>
            <div className="flex gap-4 pt-2 z-50">
              {slide?.buttons?.map(
                (btn, i) =>
                  btn?.text && (
                    <Link
                      to={btn.link}
                      key={i}
                      className="px-6 py-3 cursor-pointer rounded-xl transition-all duration-700 text-base font-medium text-white border border-gold hover:bg-gold"
                      aria-label={btn.text}
                    >
                      {btn.text}
                    </Link>
                  ),
              )}
            </div>
          </div>

          <div className="relative flex justify-end items-end h-160 w-full overflow-hidden">
            <img
              key={`hero-img-${animKey}`}
              src={slide?.image}
              alt={slide?.imageAlt || slide?.title || "Astro Sushil"}
              fetchPriority={current === 0 ? "high" : "low"}
              width={520}
              height={650}
              loading={current === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`absolute -bottom-20 h-200 scale-110 w-auto object-contain ${imgClass}`}
            />
          </div>

          <div className="absolute -bottom-5 left-[60%] -translate-x-1/2 w-full z-10 pointer-events-none">
            <img
              src="/Image/cloud.webp"
              alt="Cloud background"
              loading="lazy"
              decoding="async"
              width={1440}
              height={87}
              className="w-full object-cover"
            />
          </div>
          <div className="absolute bottom-0 -right-100 w-300 z-10 pointer-events-none">
            <img
              src="/Image/cloud.webp"
              alt="Cloud background"
              loading="lazy"
              decoding="async"
              width={1440}
              height={87}
              className="w-full object-cover"
            />
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
        role="group"
        aria-label="Slide navigation"
      >
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-pressed={i === current}
            className="relative h-6 w-6 flex items-center justify-center cursor-pointer"
          >
            <span
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? "24px" : "8px",
                background: i === current ? "#b8912f" : "rgba(255,255,255,0.3)",
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function MobileHero({ banners }) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef(null);
  const fillRef = useRef(null);

  useEffect(() => {
    preloadBannerImages(banners);
  }, [banners]);

  const startProgress = useCallback(() => {
    if (!fillRef.current) return;
    fillRef.current.style.transition = "none";
    fillRef.current.style.transform = "scaleX(0)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!fillRef.current) return;
        fillRef.current.style.transition = `transform ${AUTO_PLAY_INTERVAL}ms linear`;
        fillRef.current.style.transform = "scaleX(1)";
      });
    });
  }, []);

  const tick = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length);
    setAnimKey((k) => k + 1);
    startProgress();
  }, [banners.length, startProgress]);

  const goTo = useCallback(
    (idx) => {
      setCurrent(idx);
      setAnimKey((k) => k + 1);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, AUTO_PLAY_INTERVAL);
      startProgress();
    },
    [tick, startProgress],
  );

  useEffect(() => {
    startProgress();
    timerRef.current = setInterval(tick, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [tick]);

  const slide = banners[current];

  return (
    <section
      aria-label="Hero section — Astro Sushil personalized astrology"
      className="relative w-full overflow-hidden h-[95vh] flex flex-col"
    >
      <img
        src="/Image/hero.webp"
        alt="Background image"
        aria-hidden="true"
        fetchPriority="high"
        loading="eager"
        decoding="sync"
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 pt-10 pb-20">
        {/* Animate only changing content */}
        <div key={animKey} className="animate-fadeSlide">
          <p className="text-white/55 text-xs tracking-widest uppercase font-sans mb-3">
            {slide?.title}
          </p>

          <h1 className="text-white leading-tight text-[28px] sm:text-[32px] font-bold mb-4">
            {formatHeading(slide?.subtitle)}
          </h1>

          <p className="text-white/72 text-sm sm:text-base leading-relaxed mb-6">
            {slide?.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 z-50">
            {slide?.buttons?.map(
              (btn, i) =>
                btn?.text && (
                  <Link
                    key={i}
                    to={btn.link}
                    className="px-6 py-3 cursor-pointer rounded-xl transition-all duration-700 text-sm font-medium text-white border border-gold hover:bg-gold text-center"
                    aria-label={btn.text}
                  >
                    {btn.text}
                  </Link>
                ),
            )}
          </div>
        </div>

        {slide?.image && (
          <div className="flex justify-center items-end mt-auto pt-5 min-h-0 shrink">
            <img
              src={slide.image}
              alt={slide?.imageAlt || slide?.title || "Astro Sushil"}
              fetchPriority="low"
              loading="lazy"
              decoding="async"
              width={300}
              height={380}
              className="w-auto max-w-full max-h-[55vh] sm:max-w-xs object-contain object-bottom -ml-15 sm:ml-0"
            />

            <div className="absolute bottom-0 -right-120 w-300 z-10 pointer-events-none">
              <img
                src="/Image/cloud.webp"
                alt="Cloud"
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                width={1440}
                height={87}
                className="w-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
        role="group"
        aria-label="Slide navigation"
      >
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-pressed={i === current}
            className="relative h-6 w-6 flex items-center justify-center cursor-pointer"
          >
            <span
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? "24px" : "8px",
                background: i === current ? "#b8912f" : "rgba(255,255,255,0.3)",
              }}
            />
          </button>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          ref={fillRef}
          className="h-full bg-[#b8912f]"
          style={{
            transform: "scaleX(0)",
            transformOrigin: "left",
          }}
        />
      </div>
    </section>
  );
}

export default function HeroSection() {
  const { banners, fetchFrontendBanners } = useSettingStore();

  // matchMedia does NOT force a layout reflow; window.innerWidth does.
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    console.time("hero-fetch");

    fetchFrontendBanners("home").finally(() => {
      console.timeEnd("hero-fetch");
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!banners?.length) {
    return (
      <section
        className="relative w-full min-h-[85vh] lg:min-h-[70vh] overflow-hidden"
        aria-label="Loading hero"
      >
        <img
          src="/Image/hero.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(16,13,66,0.75) 0%, rgba(26,21,96,0.5) 100%)",
          }}
        />
      </section>
    );
  }

  return isDesktop ? (
    <DesktopHero banners={banners} />
  ) : (
    <MobileHero banners={banners} />
  );
}
