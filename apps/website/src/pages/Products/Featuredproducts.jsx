/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, A11y, Autoplay } from "swiper/modules";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../../store/useProductStore";
import { useAuthStore } from "../../store/useAuthStore";
import ProductCard from "./ProductCard";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import LoginRequiredModal from "../../utils/LoginRequiredModal";
import { useWishlistStore } from "../../store/useWishlistStore";

/* ── Price helpers ── */
function getPrice(product) {
  if (product.hasVariants && product.variants?.length) {
    const prices = product.variants.map((v) => v.price).filter(Boolean);
    const mrps = product.variants.map((v) => v.mrp).filter(Boolean);
    return {
      sale: prices.length ? Math.min(...prices) : null,
      mrp: mrps.length ? Math.min(...mrps) : null,
    };
  }
  return {
    sale: product.price ?? null,
    mrp: product.mrp || null,
  };
}

function getBadge(p) {
  if (p.isBestSeller) return "Best Seller";
  if (p.isTrending) return "Trending";
  if (p.isFeatured) return "Featured";
  return null;
}

/* ── Skeleton card (dark) ── */
function SkeletonDark() {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden animate-pulse bg-white/5">
      <div className="aspect-4/3 bg-white/8" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 bg-white/8 rounded-full w-1/3" />
        <div className="h-4 bg-white/8 rounded-full w-full" />
        <div className="h-4 bg-white/8 rounded-full w-4/5" />
        <div className="h-8 bg-white/8 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function FeaturedProducts({
  bgImage = "/Image/productbg.webp",
}) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { products, loading, getProducts } = useProductStore();
  const { getWishlist } = useWishlistStore();
  useEffect(() => {
    getProducts({ limit: 100 });
    if (user) getWishlist();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const featured = products.filter((p) => p.isFeatured && p.isPublished);

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-label="Featured Products"
    >
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <img
        src="/Image/paper.png"
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 w-full z-10"
      />

      <img
        src="/Image/paper.png"
        alt=""
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full rotate-180 z-10"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative flex flex-col items-center text-center gap-3 mb-12"
        >
          <span className="text-sm sm:text-base font-body font-semibold text-white uppercase tracking-[0.2em]">
            Our Products
          </span>

          <h2 className="font-heading text-white text-3xl sm:text-4xl md:text-5xl leading-tight font-bold">
            Explore Our Featured{" "}
            <span className="text-gold">Astrology Products</span>
          </h2>

          <p className="text-white font-body text-sm md:text-xl max-w-5xl font-normal mx-auto">
            Our astrology platform offers a complete digital experience for
            personalized guidance, learning, and spiritual growth.From live
            consultations with expert astrologers to detailed reports and
            courses, everything is designed for ease and accuracy.
          </p>

          <button
            onClick={() => navigate("/products")}
            aria-label="View all products"
            className="hidden sm:block text-white absolute top-0 right-0 border border-gold hover:bg-gold duration-700 rounded-full px-5 py-2 text-xs font-body font-medium cursor-pointer tracking-wide transition-colors"
          >
            View More
          </button>
          <button
            onClick={() => navigate("/products")}
            aria-label="View all products"
            className="sm:hidden rounded-full px-6 py-2.5 text-xs font-body font-medium text-white border border-gold hover:bg-gold transition-colors duration-700 tracking-wide"
          >
            View More
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonDark key={i} />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/40 font-body text-sm">
                No featured products available.
              </p>
            </div>
          ) : (
            <Swiper
              modules={[Autoplay, Pagination, Navigation, A11y]}
              spaceBetween={20}
              autoplay={{
                delay: 3500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              loop={true}
              breakpoints={{
                0: { slidesPerView: 1, spaceBetween: 16 },
                480: { slidesPerView: 2, spaceBetween: 16 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 20 },
                // 1440: { slidesPerView: 5, spaceBetween: 20 },
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
                prevSlideMessage: "Previous product",
                nextSlideMessage: "Next product",
              }}
              className="pb-12!"
            >
              {featured.map((product) => {
                const { sale, mrp } = getPrice(product);
                return (
                  <SwiperSlide key={product._id} className="h-auto!">
                    <ProductCard
                      user={user}
                      onLoginRequired={() => setShowLoginModal(true)}
                      _id={product._id}
                      image={product.thumbnail || product.images?.[0]}
                      badge={getBadge(product)}
                      title={product.name}
                      shortDescription={product.shortDescription}
                      originalPrice={mrp}
                      salePrice={sale}
                      gstType={product.gst?.type}
                      type={product.type}
                      rating={product.rating}
                      reviewsCount={product.reviewsCount}
                      hasVariants={product.hasVariants}
                      variants={product.variants ?? []}
                      onBook={() => navigate(`/product/${product.slug}`)}
                      usdPrice={product.priceUSD}
                      mrpUsdPrice={product.mrpUSD}
                      isInCart={product.isInCart ?? false}
                      isWishlisted={product.isInWishlist ?? false}
                    />
                  </SwiperSlide>
                );
              })}
            </Swiper>
          )}
        </motion.div>
      </div>

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Login Required"
        message="Please login to add items to your cart and continue shopping."
        redirectTo="/dashboard/"
      />
    </section>
  );
}
