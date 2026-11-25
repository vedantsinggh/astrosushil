"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, A11y, Autoplay } from "swiper/modules";

// Swiper core styles — import in your global CSS or here
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  top: parseFloat((Math.random() * 100).toFixed(2)),
  left: parseFloat((Math.random() * 100).toFixed(2)),
  size: parseFloat((Math.random() * 2.5 + 0.8).toFixed(2)),
  dur: parseFloat((Math.random() * 3 + 2).toFixed(1)),
  delay: parseFloat((Math.random() * 4).toFixed(1)),
  opacity: parseFloat((Math.random() * 0.5 + 0.3).toFixed(2)),
}));

const SERVICES = [
  {
    icon: "/Image/meetings.png", // 🔁 change if filename differs
    title: "In-Person Meetings",
    description:
      "Astrosushil deciphers the cosmic forces shaping your destiny and helps you understand change from the root. Through authentic astrological guidance, Astrosushil motivates and supports you on your journey.",
    checks: [
      "Marriage & Relationship Guidance",
      "Career & Business Decisions",
      "Legal & Relaxation Timing",
    ],
    btnLabel: "Book Appointment",
    link: "/online-consultations/?type=special",
  },
  {
    icon: "/Image/watch.png",
    title: "Wristwatch Analysis",
    description:
      "A detailed wristwatch analysis to align your timepiece with your planetary energies for better results in your daily life and personal growth.",
    checks: [
      "Personalised timing analysis",
      "Planetary energy alignment",
      "Enhanced daily productivity",
    ],
    btnLabel: "Book Appointment",
    link: "/online-consultations/?type=special",
  },
  {
    icon: "/Image/report.png",
    title: "Reports",
    description:
      "Get a customised logo designed using astrological principles to attract positivity & prosperity for your brand and business journey.",
    checks: [
      "Astrological logo design",
      "Brand energy optimisation",
      "Business growth alignment",
    ],
    btnLabel: "Get Now",
    link: "/personalized-astrology-reports",
  },
  {
    icon: "/Image/Service/OnlineVastu.png",
    title: "Online Consultation",
    description:
      "Receive personalised astrological guidance through an online consultation from anywhere in the world at your convenience.",
    checks: [
      "Horoscope reading",
      "Virtual appointments",
      "Detailed birth chart analysis",
    ],
    btnLabel: "Consult Now",
    link: "/online-consultations",
  },
];

function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STARS.map((s) => (
        <span
          key={s.id}
          className="star absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            "--dur": `${s.dur}s`,
            "--delay": `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function CheckItem({ text }) {
  return (
    <li className="flex items-start gap-2 text-[#f4eeff] text-sm leading-relaxed">
      <span className="mt-1 shrink-0 w-3.5 h-3.5 rounded-full border border-gold flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
      </span>
      <span>{text}</span>
    </li>
  );
}

function ServiceCard({ icon, title, description, checks, btnLabel, link }) {
  const navigate = useNavigate();
  return (
    <div className="card-bg backdrop-blur-xl border border-[#F4EEFF33] rounded-2xl shadow-lg p-6 flex flex-col gap-2 h-full">
      <div className="flex justify-center items-center h-16">
        <div className="relative  w-14 h-full">
          <img src={icon} alt={title} loading="lazy" decoding="async" className="object-contain " />
        </div>
      </div>

      <h3 className="text-gold text-[20px] font-semibold leading-snug text-center">
        {title}
      </h3>

      <p className="text-white/75 text-sm leading-relaxed line-clamp-3">
        {description}
      </p>

      {checks?.length > 0 && (
        <ul className="flex flex-col gap-2 flex-1">
          {checks.map((c, i) => (
            <CheckItem key={i} text={c} />
          ))}
        </ul>
      )}

      <Link
        to={link}
        className="btn-outline text-center border border-gold mt-auto w-full cursor-pointer rounded-xl py-3.5 text-sm font-semibold text-white tracking-wide hover:bg-gold transition-colors duration-700"
      >
        {btnLabel}
      </Link>
    </div>
  );
}

export default function AstrologicalSolutions() {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.load();
          video.play().catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative w-full overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        loop
        playsInline
        preload="none"
        poster="/Image/service-poster.webp"
      >
        <source
          src="https://astro-sushil.s3.ap-southeast-2.amazonaws.com/videos/service.webm"
          type="video/webm"
        />
      </video>

      <img
        src="/Image/paper.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute top-0 left-0 w-full z-10"
      />

      <img
        src="/Image/paper.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute bottom-0 left-0 w-full rotate-180 z-10"
      />

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-16 sm:py-20">
        <div className="relative flex flex-col items-center text-center gap-4 mb-12 sm:mb-14">
          <span className="text-sm font-semibold text-[#f4eeff] uppercase tracking-[0.18em]">
            Services &amp; Solutions Overview
          </span>

          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl leading-tight font-medium">
            Comprehensive <span className="text-gold">Astrological</span>{" "}
            Solutions
          </h2>

          <p className="text-[#f4eeff]/75 text-sm md:text-xl max-w-5xl leading-relaxed mt-1">
            Astrosushil deciphers the cosmic forces shaping your destiny and
            helps you understand change from the root. Through authentic
            astrological guidance, Astrosushil motivates and supports you on
            your journey, offering holistic solutions for every sphere of life.
          </p>

          <button
            onClick={() => navigate("/services")}
            className=" text-white md:absolute md:top-0 md:right-0 rounded-full px-5 py-2 text-xs font-medium border border-gold cursor-pointer tracking-wide shadow-lg hover:bg-gold transition-colors duration-700"
          >
            View More
          </button>
        </div>

        <Swiper
          modules={[Autoplay, Pagination, Navigation, A11y]}
          spaceBetween={20}
          slidesPerView={3}
          loop={true}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          breakpoints={{
            320: { slidesPerView: 1, spaceBetween: 10 },
            480: { slidesPerView: 1.4, spaceBetween: 16 },
            640: { slidesPerView: 2, spaceBetween: 18 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
          }}
          pagination={{
            clickable: true,
            bulletClass: "swiper-bullet",
            bulletActiveClass: "swiper-bullet-active",
            renderBullet: (index, className) =>
              ` <button 
    class="${className}" 
    aria-label="Go to slide ${index + 1}" 
    type="button"
    style="width:20px;height:20px;"
  ></button>`,
          }}
          navigation={{
            prevEl: ".swiper-btn-prev",
            nextEl: ".swiper-btn-next",
          }}
          className="pb-12!"
        >
          {SERVICES.map((svc, i) => (
            <SwiperSlide key={i} className="h-auto!">
              <ServiceCard {...svc} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="flex sm:hidden justify-center gap-3 -mt-4">
          <button
            className="swiper-btn-prev w-9 h-9 rounded-full border border-gold text-gold flex items-center justify-center hover:bg-gold/10 transition-all disabled:opacity-30"
            aria-label="Previous"
          >
            &#8592;
          </button>
          <button
            className="swiper-btn-next w-9 h-9 rounded-full border border-gold text-gold flex items-center justify-center hover:bg-gold/10 transition-all disabled:opacity-30"
            aria-label="Next"
          >
            &#8594;
          </button>
        </div>
      </div>

      <style>{`
        .swiper-bullet {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 20px;  
  height: 20px; 
  margin: 0 6px;
  background: transparent;
  border: none;
  cursor: pointer;
}


.swiper-bullet::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.3);
  transition: all 0.3s ease;
}


.swiper-bullet-active::before {
  width: 24px;
  height: 8px;
  background: #d4af37;
  border-radius: 999px;
}
      `}</style>
    </section>
  );
}
