/* eslint-disable no-unused-vars */
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { motion } from "framer-motion";

import "swiper/css";

const MEDIA = [
  {
    name: "The Print",
    src: "/Image/media/the-print.png",
    url: "https://theprint.in/ani-press-releases/astrosushil-by-sushil-kumar-singh-empowers-1-lakh-learners-through-astrology-courses-with-global-reach/2649259/",
  },
  {
    name: "Business Standard",
    src: "/Image/media/business-standard.png",
    url: "https://share.google/t4o5SEfbCPkcHnXGN",
  },
  {
    name: "The Wire",
    src: "/Image/media/the-wire.png",
    url: "https://thewire.in/ptiprnews/astrosushil-by-sushil-kumar-singh-35-years-of-trusted-astrological-wisdom-and-global-reach",
  },
  {
    name: "ANI",
    src: "/Image/media/ani.png",
    url: "https://www.aninews.in/news/business/astrosushil-by-sushil-kumar-singh-empowers-1-lakh-learners-through-astrology-courses-with-global-reach20250606121121/",
  },
  {
    name: "The Tribune",
    src: "/Image/media/the-tribune.png",
    url: "https://www.tribuneindia.com/news/business/astrosushil-by-sushil-kumar-singh-empowers-1-lakh-learners-through-astrology-courses-with-global-reach/",
  },
  {
    name: "Lokmat Times",
    src: "/Image/media/lokmat-times.png",
    url: "https://www.lokmattimes.com/entertainment/astrologer-predicts-salman-khan-and-shah-rukh-khans-demise-faces-massive-backlash-from-netizens-a510/",
  },
  {
    name: "Times of India",
    src: "/Image/media/times-entertainment.png",
    url: "https://timesofindia.indiatimes.com/entertainment/hindi/bollywood/news/astrologer-warns-of-salman-khans-danger-but-says-shah-rukh-khan-will-keep-rising/articleshow/125426370.cms",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerHeading = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const wordAnim = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function MediaPress() {
  return (
    <section
      className="w-full bg-white pb-14 overflow-hidden"
      aria-labelledby="media-press-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerHeading}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="text-center mb-10"
        >
          <motion.h2
            id="media-press-heading"
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-[#2d2060] mb-3"
          >
            Media &amp; <span className="text-gold">Press</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-black text-sm sm:text-lg">
            Featured in leading national and international media outlets
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full   origin-left"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
        >
          <Swiper
            modules={[Autoplay]}
            spaceBetween={24}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            speed={4000}
            breakpoints={{
              480: { slidesPerView: 2, spaceBetween: 24 },
              768: { slidesPerView: 3, spaceBetween: 28 },
              // 1024: { slidesPerView: 4, spaceBetween: 32 },
            }}
            className="media-swiper"
          >
            {MEDIA.map((outlet, i) => (
              <SwiperSlide key={i}>
                <LogoSlide outlet={outlet} />
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full  bg-gray-200 origin-right"
        />
      </div>
    </section>
  );
}

function LogoSlide({ outlet }) {
  return (
    <motion.a
      href={outlet.url}
      target="_blank"
      rel="noopener noreferrer"
      // whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="block rounded-2xl overflow-hidden border-2 border-gold shadow-md cursor-pointer"
    >
      <img
        src={outlet.src}
        alt={outlet.name}
        loading="lazy"
        decoding="async"
        className="w-full h-105 object-cover object-top"
      />
      <div className="bg-white px-3 py-2 text-center text-sm font-semibold text-[#2d2060] truncate">
        {outlet.name}
      </div>
    </motion.a>
  );
}
