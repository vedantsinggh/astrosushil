import { Star } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useSettingStore } from "../../store/usSettingStore";
import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, A11y, Autoplay } from "swiper/modules";

function StarRating({ count = 5 }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${count} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={16}
          className={i < count ? "text-gold" : "text-black/20"}
          fill={i < count ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const messageRef = useRef(null);

  useEffect(() => {
    if (messageRef.current) {
      setIsTruncated(
        messageRef.current.scrollHeight > messageRef.current.clientHeight,
      );
    }
  }, [testimonial.message]);

  return (
    <article
      className="
        relative bg-white rounded-2xl
        pt-12 pb-6 px-6 sm:px-7
        border border-black/10
        flex flex-col gap-4 h-full
        overflow-visible
      "
    >
      {/* Avatar */}
      {/* <div className="absolute -top-6 left-6 z-10 bg-white rounded-full">
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className="
            w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover
            ring-4 ring-white shadow-md
          "
        />
      </div> */}

      {testimonial.image ? (
        <div className="absolute -top-6 left-6 z-10 bg-white rounded-full">
          <img
            src={testimonial.image}
            alt={testimonial.name}
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            className="
              w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover
              ring-4 ring-white shadow-md
            "
          />
        </div>
      ) : (
        <div className="absolute -top-6 left-6 z-10">
          <div
            className="
              w-14 h-14 sm:w-16 sm:h-16 rounded-full
              bg-gray-200 ring-4 ring-white shadow-md
              flex items-center justify-center
              font-semibold text-2xl text-gray-700
            "
          >
            {testimonial.name?.trim().charAt(0).toUpperCase() || "?"}
          </div>
        </div>
      )}

      {/* Rating */}
      <div className="flex justify-end">
        <StarRating count={testimonial.rating} />
      </div>

      {/* Message */}
      <div className="flex-1 flex flex-col items-start">
        <p
          ref={messageRef}
          className={`text-black/65 text-sm sm:text-[0.9rem] leading-relaxed font-body ${
            !isExpanded ? "line-clamp-3" : ""
          }`}
        >
          {testimonial.message}
        </p>

        {isTruncated && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary text-xs font-semibold hover:underline mt-2"
          >
            {isExpanded ? "Read Less" : "Read More"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-black/10">
        <p className="text-primary text-sm font-bold leading-tight">
          {testimonial.name}
        </p>
        <p className="text-black/45 text-xs font-body mt-0.5">
          {testimonial.designation}
        </p>
      </div>
    </article>
  );
}

export default function TestimonialsSection() {
  const { testimonials, loading } = useSettingStore(
    useShallow((s) => ({ testimonials: s.testimonials, loading: s.loading }))
  );
  const fetchTestimonials = useSettingStore((s) => s.fetchTestimonials);

  useEffect(() => {
    fetchTestimonials({
      page: "home",
      isActive: true,
    });
  }, [fetchTestimonials]);

  return (
    <section className="w-full bg-secondary/20 py-6 sm:py-10 lg:py-14 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 overflow-visible">
        {/* Heading */}
        <div className="flex flex-col items-center text-center gap-4 mb-14 sm:mb-16">
          <p className="text-primary text-sm sm:text-base tracking-widest uppercase font-body font-semibold">
            Our Testimonials
          </p>

          <h2 className="font-heading text-primary text-3xl sm:text-4xl lg:text-5xl leading-tight">
            What Our <span className="text-gold">Clients Say</span>
          </h2>

          <p className="text-black text-sm sm:text-xl max-w-5xl font-body">
            Our testimonials reflect the real experiences of users who have
            found clarity and guidance through our astrology platform.
          </p>
        </div>

        {/* Swiper */}
        <Swiper
          modules={[Autoplay, Pagination, Navigation, A11y]}
          spaceBetween={20}
          loop={true}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          breakpoints={{
            0: { slidesPerView: 1, spaceBetween: 16 },
            480: { slidesPerView: 2, spaceBetween: 16 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
          }}
          pagination={{
            clickable: true,
            bulletClass: "fp-bullet",
            bulletActiveClass: "fp-bullet-active",
            renderBullet: (_, cls) =>
              `<button class="${cls}" aria-label="Go to slide"></button>`,
          }}
          navigation={{
            prevEl: ".fp-prev",
            nextEl: ".fp-next",
          }}
          a11y={{
            prevSlideMessage: "Previous slide",
            nextSlideMessage: "Next slide",
          }}
          className="w-full pb-16 overflow-visible"
        >
          {!loading &&
            testimonials?.map((t, i) => (
              <SwiperSlide
                key={t._id}
                className="h-auto! pt-6 pb-10 overflow-visible"
              >
                <TestimonialCard testimonial={t} />
              </SwiperSlide>
            ))}
        </Swiper>
      </div>
    </section>
  );
}
