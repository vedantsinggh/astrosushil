/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: i * 0.15 },
  }),
};

export default function AboutAstrologer() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <section className="relative w-full py-12 overflow-hidden ">
      <img
        src="/Image/bg.webp"
        alt="Background"
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={1920}
        height={600}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="max-w-7xl mx-auto px-5">
        <motion.div
          className="text-center mb-10 lg:mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-sm font-semibold uppercase tracking-[0.22em] text-primary block mb-3"
          >
            About Astrologer
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-primary text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-tight"
          >
            Astro Sushil Kumar Singh –{" "}
            <span className="text-gold">Vedic Astrologer in India</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-4 text-primary text-xl max-w-5xl mx-auto "
          >
            Astro Sushil Sir is known for his profound wisdom, clear guidance,
            and deeply intuitive understanding of Vedic astrology. With a calm
            presence and an extraordinary ability to simplify even the most
            complex cosmic patterns, he helps people find clarity, direction,
            and confidence in their life journey. His insights are trusted, his
            predictions are precise, and his approach is always rooted in
            sincerity and compassion.
          </motion.p>
        </motion.div>

        <motion.div
          className="sm:px-0 py-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center relative overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="relative z-10 space-y-3">
            <motion.h3
              variants={fadeUp}
              custom={0}
              className="text-primary text-[22px] sm:text-3xl font-bold leading-snug"
            >
              Our Story
            </motion.h3>

            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-primary text-xl leading-relaxed max-w-4xl"
            >
              Astro Sushil Kumar Singh is one of India's most trusted astrology
              authorities, carrying forward the legacy of his revered mentor
              K.N. Rao. Since beginning his astrological journey as a child, he
              has grown into a global-facing guide — blending the time-tested
              wisdom of Vedic and Nadi traditions with the precision of modern,
              <br />
              <br />
              His lineage traces back to the Suryavanshi (Sun-Dynasty) roots of
              Ayodhya, invoking the enduring spirit of the Ramayana and its
              dharmic values. Under his guidance, ancient scriptures meet the
              demands of today's world — empowering professionals, families, and
              seekers with clear, actionable direction.
            </motion.p>

            {pathname === "/" && (
              <motion.button
                variants={fadeUp}
                custom={3}
                whileTap={{ scale: 0.97 }}
                className="mt-2 px-7 py-2.5 bg-primary text-white text-sm sm:text-base font-medium rounded-lg hover:bg-gold transition-colors duration-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                aria-label="Read more about Astro Sushil Kumar Singh"
                onClick={() => navigate("/about-us")}
              >
                Read More
              </motion.button>
            )}
          </div>

          <motion.div
            variants={fadeUp}
            custom={1}
            className="relative z-10 flex justify-center lg:justify-end shrink-0"
          >
            <img
              src="/Image/About.webp"
              alt="Astro Sushil Kumar Singh"
              loading="lazy"
              decoding="async"
              width={400}
              height={480}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
