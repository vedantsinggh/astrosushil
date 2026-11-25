/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConsultationStore } from "../../store/useConsultationStore";
import { useCurrency } from "../../hooks/useCurrency";

const MODE_LABELS = {
  audio: "Voice Call",
  video: "Video Call",
  in_person: "In-Person",
};

function DashedDivider() {
  return (
    <div
      className="w-full border border-t border-dashed border-white/60 my-2.5"
      aria-hidden="true"
    />
  );
}

export function ConsultationCard({
  badge,
  title,
  items = [],
  // includes = [],
  note,
  btnLabel = "Book Now",
  onBook,
  featured = false,
}) {
  return (
    <article
      className={[
        "relative flex flex-col h-full rounded-2xl overflow-hidden",
        "bg-linear-to-b from-[#2a1a6e] to-[#1a0f4e]",
        "border p-5 transition-transform duration-300 bg-[url('/Image/card-bg.webp')] bg-no-repeat bg-center bg-cover",
        featured
          ? "border-gold/60 shadow-[0_0_32px_rgba(212,175,55,0.22)]"
          : "border-white/10",
      ].join(" ")}
      aria-label={`${title} consultation plan`}
    >
      {/* <div className="absolute inset-0 bg-linear-to-r from-[#2a1a6e]/40 via-transparent to-[#1a0f4e]/40 rounded-2xl -z-10" /> */}

      {featured && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          aria-hidden="true"
        />
      )}

      {badge && (
        <span className="self-start rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 tracking-wide mb-1">
          {badge}
        </span>
      )}

      <h3 className="text-gold font-bold text-xl  w-full mt-1 text-center">
        {title}
      </h3>

      <div className="flex flex-col mt-3 bg-white/5 rounded-lg px-4 py-2 flex-1 backdrop-blur-xl">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between py-1">
              <span className="text-white/80 text-[13px] font-medium">
                {item.label}
              </span>
              <span className="text-white font-semibold text-[14px]">
                {item.price}
              </span>
            </div>
            {i < items.length - 1 && <DashedDivider />}
          </div>
        ))}
        {note && (
          <>
            <DashedDivider />
            <p className="text-white/80 text-[12px] leading-relaxed my-4">
              {note}
            </p>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end mt-2">
        {/* {includes?.length > 0 && (
          <>
            <DashedDivider />
            <ul className="flex flex-col gap-1.5 mb-2">
              {includes.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/60 leading-relaxed">
                  <span className="text-gold mt-0.5 shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </>
        )} */}
        <button
          onClick={onBook}
          className="w-full rounded-xl border border-gold bg-transparent py-3 text-[14px] font-semibold text-white tracking-wide cursor-pointer transition-colors duration-700 hover:bg-gold active:scale-[0.97]"
          aria-label={`Book ${title}`}
        >
          {btnLabel}
        </button>
      </div>
    </article>
  );
}

export default function ConsultationSection() {
  const { convert } = useCurrency();
  const navigate = useNavigate();
  const { consultations, loading, getConsultations } = useConsultationStore();
  const [SC, setSC] = useState(null);

  useEffect(() => {
    getConsultations();
    Promise.all([
      import("swiper/react"),
      import("swiper/modules"),
      import("swiper/css"),
    ]).then(([{ Swiper, SwiperSlide }, { Pagination, Autoplay, A11y }]) => {
      setSC({ Swiper, SwiperSlide, Pagination, Autoplay, A11y });
    });
  }, []);

  const plans = consultations
    .filter((c) => c.isActive)
    .map((c) => ({
      _id: c._id,
      badge: c.responseDays > 0 ? `On ${c.responseDays} Day` : undefined,
      title: c.title,
      // ← modes[] array se har mode ka alag price row
      items: (c.modes || []).map((m) => ({
        label: MODE_LABELS[m.mode] || m.mode,
        price: m.price?.inr ? convert(m.price.inr) : "—",
      })),
      note: c.note || c.description || undefined,
      includes: c.includes || [],
      featured: c.type === "special",
    }));

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-labelledby="consultation-heading"
    >
      <img
        src="/Image/bg.webp"
        alt="Background"
        aria-hidden="true"
        width={1920}
        height={1200}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-8">
          <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-primary block mb-3">
            EXPERT VEDIC ASTROLOGY CONSULTATION
          </span>
          <h2
            id="consultation-heading"
            className="text-primary text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
          >
            Find the Right <span className="text-gold">Consultation</span> for
            You
          </h2>
          <p className="mt-4 text-primary text-sm md:text-xl max-w-5xl mx-auto ">
            Consultation plans offer users personalized guidance from expert
            astrologers based on their queries and life concerns.Users can
            choose from flexible options like chat or call sessions, with
            customizable durations and pricing. These plans are designed to
            provide accurate insights, helping users make informed decisions
            about their future.
          </p>
        </div>

        {loading && (
          <p className="text-center text-white/50 text-sm py-10">Loading...</p>
        )}

        {!loading &&
          plans.length > 0 &&
          (SC ? (
            <SC.Swiper
              modules={[SC.Pagination, SC.Autoplay, SC.A11y]}
              spaceBetween={10}
              slidesPerView={3}
              loop={true}
              autoplay={{
                delay: 3500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
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
    style="width:28px;height:28px; "
  ></button>`,
              }}
              navigation={{
                prevEl: ".swiper-btn-prev",
                nextEl: ".swiper-btn-next",
              }}
              a11y={{ enabled: true }}
              breakpoints={{
                320: { slidesPerView: 1, spaceBetween: 10 },
                480: { slidesPerView: 1.4, spaceBetween: 16 },
                640: { slidesPerView: 2, spaceBetween: 18 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                1280: { slidesPerView: 4, spaceBetween: 20 },
              }}
              className="pb-10!"
            >
              {plans.map((plan) => (
                <SC.SwiperSlide key={plan._id} className="h-auto! self-stretch">
                  <ConsultationCard
                    {...plan}
                    onBook={() => navigate(`/online-consultations`)}
                  />
                </SC.SwiperSlide>
              ))}
            </SC.Swiper>
          ) : (
            <p className="text-center text-white/50 text-sm py-10">
              Loading...
            </p>
          ))}
      </div>
    </section>
  );
}
