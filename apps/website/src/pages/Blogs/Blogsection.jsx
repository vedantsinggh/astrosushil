/* eslint-disable no-unused-vars */
import React, { useEffect } from "react";

import { useShallow } from "zustand/react/shallow";
import { useSettingStore } from "../../store/usSettingStore";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { motion } from "framer-motion";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useNavigate } from "react-router-dom";
import BlogCard from "./BlogCard";

function Blogsection() {
  const navigate = useNavigate();
  const blogs = useSettingStore((s) => s.blogs);
  const fetchBlogs = useSettingStore((s) => s.fetchBlogs);

  useEffect(() => {
    fetchBlogs({ limit: 12 });
  }, [fetchBlogs]);

  return (
    <section
      className="py-10 bg-no-repeat relative bg-cover bg-center   "
      aria-label="Featured Products"
    >
      <img
        src={"Image/bg.webp"}
        alt="Background"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="max-w-7xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative flex flex-col items-center text-center gap-4 mb-12"
        >
          <span className="text-xs sm:text-base font-semibold  text-primary uppercase tracking-[0.2em]">
            Our Blogs
          </span>

          <h2 className="text-primary text-3xl sm:text-4xl md:text-5xl leading-tight font-bold">
            Latest Astrology 
 <span className="text-gold ml-2">Blogs & Vedic Insights</span>
          </h2>

          <p className="text-black text-sm md:text-xl max-w-5xl px-2">
            Explore our latest astrology blogs covering Kundli analysis, horoscope predictions, Vedic remedies, numerology, Vastu, gemstones, zodiac signs, and spiritual guidance. Our articles are written to help you understand astrology in a simple and practical way, so you can make informed decisions in every stage of life.

          </p>

          <button
            onClick={() => navigate("/blog")}
            className="hidden sm:block absolute bg-primary hover:bg-gold transition-colors duration-700 text-white top-0 right-0 view-more-btn rounded-full px-5 py-2 text-xs font-medium  cursor-pointer tracking-wide shadow-lg"
            aria-label="View all products"
          >
            View More
          </button>

          <button
            onClick={() => navigate("/blog")}
            className="sm:hidden view-more-btn bg-primary hover:bg-gold transition-colors duration-700 text-white rounded-full px-6 py-2.5 text-xs font-medium tracking-wide shadow-lg mt-1"
            aria-label="View all products"
          >
            View More
          </button>
        </motion.div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          navigation={false}
          pagination={false}
          autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
          loop={blogs.length > 4}
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 1 },
            480: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
            // 1536: { slidesPerView: 5 },
          }}
          className="pb-10"
        >
          {blogs.map((item, i) => (
            <SwiperSlide key={item._id || i} className="h-auto!">
              <BlogCard item={item} index={i} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

export default Blogsection;
