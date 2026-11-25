/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useRef, useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y, Autoplay } from "swiper/modules";
import { Play, ChevronLeft, ChevronRight,  } from "lucide-react";
import "swiper/css";
import { useSettingStore } from "../../store/usSettingStore";

function NavArrows({ prevRef, nextRef }) {
  return (
    <div className="flex items-center gap-2">
      <button
        ref={prevRef}
        type="button"
        aria-label="Previous slide"
        className="
          w-9 h-9 rounded-full border cursor-pointer border-black/15 bg-white
          flex items-center justify-center
          hover:bg-primary hover:border-primary hover:text-white
          text-black/50 transition-all duration-700
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          disabled:opacity-30 disabled:cursor-not-allowed
        "
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <button
        ref={nextRef}
        type="button"
        aria-label="Next slide"
        className="
          w-9 h-9 rounded-full border cursor-pointer border-black/15 bg-white
          flex items-center justify-center
          hover:bg-primary hover:border-primary hover:text-white
          text-black/50 transition-all duration-700
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          disabled:opacity-30 disabled:cursor-not-allowed
        "
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function TestimonialCard({ item }) {
  return (
    <article className="flex flex-col gap-3 group h-full border border-black rounded-2xl overflow-hidden">
      <div className="relative rounded-t-xl overflow-hidden aspect-video bg-black/10">
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          decoding="async"
          width={338}
          height={225}
          className="w-full h-full object-cover transition-transform duration-500"
        />

        {/* <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" /> */}

        {item.tag?.trim() && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-[10px] tracking-widest uppercase px-3 py-1 rounded-full">
            <span
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              aria-hidden="true"
            />
            {item.tag.trim()}
          </span>
        )}

        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch: ${item.title}`}
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
        </a>
      </div>

      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <h3 className="font-heading text-primary text-base sm:text-lg leading-snug line-clamp-2">
          {item.title}
        </h3>
        <p className="text-black/55 text-sm font-body leading-relaxed line-clamp-3">
          {item.description}
        </p>

        <a
          href={item.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            w-full items-center gap-1.5 mt-auto pt-2
            text-primary text-xs tracking-widest uppercase font-body font-medium
             pb-0.5 transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary
          "
        >
          <div className="w-full h-px bg-black/10 rounded-full" />
          <img
            src="/Image/yt-logo.png"
            alt="Youtube"
            loading="lazy"
            decoding="async"
            width={120}
            height={28}
            className="w-30 pt-1"
          />
        </a>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 h-full border border-black/10 rounded-2xl overflow-hidden p-3 animate-pulse">
      <div className="rounded-xl aspect-video bg-black/10" />
      <div className="flex flex-col gap-2 px-1">
        <div className="h-4 w-3/4 bg-black/10 rounded" />
        <div className="h-3 w-full bg-black/8 rounded" />
        <div className="h-3 w-5/6 bg-black/8 rounded" />
      </div>
    </div>
  );
}

function SliderBlock({
  id,
  badge,
  heading,
  headingGold,
  sub,
  viewMoreHref,
  items,
  CardComponent,
  loading = false,
}) {
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10">
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="text-primary text-sm tracking-widest uppercase font-body"
          >
            {badge}
          </p>
          <h2
            id={id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="font-heading text-primary text-2xl sm:text-3xl lg:text-4xl leading-tight"
          >
            {heading} <span className="text-gold">{headingGold}</span>
          </h2>
          {sub && (
            <p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="text-black text-lg font-body"
            >
              {sub}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NavArrows prevRef={prevRef} nextRef={nextRef} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-black/40 text-sm font-body text-center py-10">
          No videos found.
        </p>
      ) : (
        <Swiper
          modules={[Autoplay, Navigation, A11y]}
          navigation={true}
          loop={true}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = prevRef.current;
            swiper.params.navigation.nextEl = nextRef.current;
          }}
          spaceBetween={24}
          slidesPerView={1}
          breakpoints={{
            540: { slidesPerView: 1.4, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 2.5, spaceBetween: 28 },
            1280: { slidesPerView: 3, spaceBetween: 28 },
          }}
          a11y={{
            prevSlideMessage: "Previous slide",
            nextSlideMessage: "Next slide",
          }}
          aria-label={`${badge} slider`}
          // equal height slides
          className="pb-0! [&_.swiper-wrapper]:items-stretch"
        >
          {items.map((item) => (
            <SwiperSlide key={item._id || item.id} className="h-auto!">
              <CardComponent item={item} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}

export default function MediaSection() {
  const { fetchMedia } = useSettingStore();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchMedia({ section: "podcast" });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setTestimonials(
        items.filter((m) => m.isActive).sort((a, b) => a.order - b.order),
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section
      aria-label="Podcast media section"
      className="relative w-full overflow-hidden"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12">
        <div className="pb-16">
          <SliderBlock
            id="podcast-section"
            badge=""
            heading="Podcasts & "
            headingGold="Insights"
            sub="Listen to wisdom from Astro Sushil"
            viewMoreHref="#"
            items={testimonials}
            CardComponent={TestimonialCard}
            loading={loading}
          />
        </div>
      </div>
    </section>
  );
}
