/* eslint-disable no-unused-vars */
import React from "react";
import PageHero from "../../components/HeroPage";
import AboutAstrologer from "../Home/Aboutastrologer";
import { motion } from "framer-motion";
import Seo from "../../components/Seo";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

const FEATURES = [
  {
    id: 1,
    title: "Holistic Remedies & Offerings",
    description:
      "Beyond forecasting, he introduces transformative tools — live consultations, digital wallpapers, Shri Yantras, goddess imagery, Ayurvedic-inspired frameworks — all crafted to integrate with your modern lifestyle.",
  },
  {
    id: 2,
    title: "Comprehensive Services",
    description:
      "From marriage-timing mastery (95% accuracy guarantee for Guri Nadi clients) to wealth-attraction kits and educational career mappings, his offerings adapt to life's key inflection points.",
  },
  {
    id: 3,
    title: "Global Perspective, Local Heart",
    description:
      "Though based in India, his insights reach across continents — USA, Canada, UAE, Australia, Europe — catering to a diverse, cosmopolitan audience.",
  },
  {
    id: 4,
    title: "Proven Accuracy",
    description:
      "With a specialisation in Guri Nadi Astrology and a deep grounding in the K.N. Rao tradition, Astro Sushil offers forecasts and consultations rooted in decades of disciplined study and client success.",
  },
  {
    id: 5,
    title: "Corporate-Tech Spiritual Style",
    description:
      "The brand bridges powerful spiritual heritage with the demands of the digital age. Whether you're an executive navigating business cycles, a couple planning marriage, or an individual aligning life with purpose — the aesthetic and methodology are sleek, professional, and spiritually grounded.",
    wide: true,
  },
];
function FeatureCard({ feature, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
      className={`relative bg-white/6 border border-white/20 rounded-lg p-5 sm:p-6
                  backdrop-blur-xl hover:bg-white/10 hover:border-gold/20 overflow-hidden
                  transition-all duration-300 group
                  ${feature.wide ? "sm:col-span-2 lg:col-span-2" : ""}`}
    >
      <NumberBadge n={feature.id} />

      <h3 className="font-heading text-gold text-base sm:text-lg leading-snug mb-2 pr-6 transition-colors duration-300">
        {feature.title}
      </h3>

      <p className="text-white text-sm font-body leading-relaxed">
        {feature.description}
      </p>

      {/* <div
        className="absolute bottom-0 left-6 right-6 h-px bg-gradient-gold scale-x-0 group-hover:scale-x-100
                      transition-transform duration-300 origin-left rounded-full"
        aria-hidden="true"
      /> */}
    </motion.div>
  );
}
function NumberBadge({ n }) {
  return (
    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg shrink-0 z-10">
      <span className="font-heading text-black text-lg font-bold leading-none">
        {n}
      </span>
    </div>
  );
}
function BrandCard({ feature, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
      className={`relative bg-white/6 border border-white/20 rounded-lg px-5 py-4
                  backdrop-blur-sm hover:bg-white/10 hover:border-gold/20 overflow-hidden
                  transition-all duration-300 group
                  ${feature.wide ? "sm:col-span-2 lg:col-span-2" : ""}`}
    >
      <NumberBadge n={feature.id} />

      <h3
        className="font-heading text-white text-base sm:text-lg leading-snug pr-6
                     group-hover:text-gold transition-colors duration-300"
      >
        {feature.title}
      </h3>
    </motion.div>
  );
}
function MissionVisionCard({ title, text, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className="relative flex flex-col items-center text-center gap-4
                 rounded-2xl px-7 py-3 sm:px-8 sm:py-4
                 border border-white/10 shadow-xl
                 bg-[url('/Image/card-bg.webp')] bg-cover bg-bottom bg-no-repeat"
    >
      <div className="absolute inset-0 bg-linear-to-r from-[#2a1a6e]/20 via-transparent to-[#1a0f4e]/20 rounded-2xl" />

      <img
        src="/Image/mission-icon.png"
        alt=""
        aria-hidden="true"
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        className="absolute top-3 left-1 -translate-x-1/2 w-12 h-12 object-contain"
      />

      <h3 className="font-heading text-gold text-xl sm:text-2xl mt-3">
        {title}
      </h3>

      <p className="text-white text-sm sm:text-base font-body leading-relaxed max-w-xs">
        {text}
      </p>
    </motion.div>
  );
}
function AboutUs() {
  return (
    <>
      <Seo page="about-us" />
      <PageHero
        title="About Astro Sushil – Trusted Vedic Astrologer"
        highlight="fascinating"
        subtitle="Learn about Astro Sushil's journey, experience, and vision in Vedic astrology. Discover our commitment to helping people through accurate Kundli analysis, practical guidance, and authentic Vedic principles."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
        ]}
      />
      <AboutAstrologer />
      <section
        aria-labelledby="why-choose-heading"
        className="relative w-full overflow-hidden  py-16 sm:py-20 lg:py-24"
      >
        <img
          src={"/Image/about-bg.webp"}
          alt="Background"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full max-w-7xl mx-auto object-cover"
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

        <div className="absolute inset-0 bg-linear-to-r from-[#100D42] via-[#100D42]/50 to-[#100D42] max-w-7xl mx-auto" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex flex-col items-center text-center gap-3 mb-12 sm:mb-14">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="text-white text-sm tracking-widest uppercase font-body"
            >
              Why Choose Us
            </motion.p>

            <motion.h2
              id="why-choose-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight"
            >
              Why Choose <span className="text-gold">Astro Sushil?</span>
            </motion.h2>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-12">
            <div className="hidden sm:block h-52 w-120 absolute border-2 border-dashed border-white/80 left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2" />
            <div className="hidden sm:block h-40 w-40 absolute border-2 border-dashed border-white/80 left-1/2 top-[61.8%] -translate-x-1/2 -translate-y-1/2" />

            <FeatureCard
              feature={{
                id: 1,
                title: "Holistic Remedies & Offerings",
                description:
                  "Beyond forecasting, he introduces transformative tools — live consultations, digital wallpapers, Shri Yantras, goddess imagery, Ayurvedic-inspired frameworks — all crafted to integrate with your modern lifestyle.",
              }}
              delay={0}
            />

            <FeatureCard
              feature={{
                id: 2,
                title: "Comprehensive Services",
                description:
                  "From marriage-timing mastery (95% accuracy guarantee for Guri Nadi clients) to wealth-attraction kits and educational career mappings, his offerings adapt to life's key inflection points.",
              }}
              delay={0.1}
            />

            <FeatureCard
              feature={{
                id: 3,
                title: "Global Perspective, Local Heart",
                description:
                  "Though based in India, his insights reach across continents — USA, Canada, UAE, Australia, Europe — catering to a diverse, cosmopolitan audience.",
              }}
              delay={0.2}
            />

            <FeatureCard
              feature={{
                id: 4,
                title: "Proven Accuracy",
                description:
                  "With a specialisation in Guri Nadi Astrology and a deep grounding in the K.N. Rao tradition, Astro Sushil offers forecasts and consultations rooted in decades of disciplined study and client success.",
              }}
              delay={0.3}
            />

            <div className="sm:col-span-2 flex justify-center">
              <div className="w-full lg:w-[50%]">
                <FeatureCard
                  feature={{
                    id: 5,
                    title: "Corporate-Tech Spiritual Style",
                    description:
                      "The brand bridges powerful spiritual heritage with the demands of the digital age. Whether you're an executive navigating business cycles, a couple planning marriage, or an individual aligning life with purpose — the aesthetic and methodology are sleek, professional, and spiritually grounded.",
                  }}
                  delay={0.4}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="mission-vision-heading"
        className="relative w-full py-4 sm:py-6 lg:py-8"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex flex-col items-center text-center gap-3 mb-12 sm:mb-14">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="text-primary text-sm sm:text-base tracking-widest uppercase font-body"
            >
              Our Destiny
            </motion.p>

            <motion.h2
              id="mission-vision-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-heading text-primary text-3xl sm:text-4xl lg:text-5xl leading-tight"
            >
              Mission &amp; <span className="text-gold">Vision</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <MissionVisionCard
              title="Mission"
              text="To empower individuals to reclaim destiny with clarity — where corporate ambition meets cosmic wisdom, and spiritual insight drives tangible results."
              delay={0.1}
            />
            <MissionVisionCard
              title="Vision"
              text="A world where ancient wisdom is not relegated to the fringes, but instead functions as a strategic tool for success, harmony and purpose in the 21st century."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="why-choose-heading"
        className="relative w-full overflow-hidden py-16"
      >
        <img
          src={"/Image/about-bg.webp"}
          alt="Background"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full max-w-7xl mx-auto object-cover"
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

        <div className="absolute inset-0 bg-linear-to-r from-[#100D42] via-[#100D42]/50 to-[#100D42] max-w-7xl mx-auto" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex flex-col items-center text-center gap-3 mb-12 sm:mb-14">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="text-white text-sm tracking-widest uppercase font-body"
            >
              Our Promises
            </motion.p>

            <motion.h2
              id="why-choose-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight"
            >
              Brand <span className="text-gold">Promise</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 sm:gap-8">
            <BrandCard
              feature={{
                id: 1,
                title: "India’s Most Trusted Astrology Authority",
              }}
              delay={0}
            />

            <BrandCard
              feature={{
                id: 2,
                title: "Corporate Mind Meets Cosmic Wisdom",
              }}
              delay={0.1}
            />

            <BrandCard
              feature={{
                id: 3,
                title: "The Science of Destiny. The Accuracy of Gupt Nadi",
              }}
              delay={0.2}
            />

            <BrandCard
              feature={{
                id: 4,
                title: "India’s No. 1 Marriage Timing Specialist",
              }}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      <section className="w-full bg-[url('/Image/bg.webp')] bg-cover bg-center bg-no-repeat py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            <div className="flex flex-col gap-5">
              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0}
                className="text-[#2B2B55] text-sm sm:text-lg"
              >
                About Astrologer
              </motion.p>

              <motion.h2
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.1}
                className="text-4xl lg:text-5xl text-[#2B2B55] leading-tight"
              >
                Meet The <span className="text-[#C8A04D]">Expert</span>
              </motion.h2>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.2}
                className="  text-lg "
              >
                <p>
                  Astro Sushil’s path began at age six, inspired by celestial
                  patterns and an unshakable drive to decode them. Over the
                  years, he established himself as a scholar, advisor and
                  teacher — his guided thousands of clients and trained students
                  across continents. His approach blends the analytical rigor of
                  Vedic Jyotish with the intuitive depth of Nadi Shastra and the
                  structural acuity of Vastu Shastra.
                </p>

                <p>
                  Through his courses — including Vastu Nadi Astrology, Marriage
                  & Money Astrology, Dash Mahavidya — he fosters a community of
                  empowered learners, where spiritual discipline meets strategic
                  growth.
                </p>

                <div className="pt-5 space-y-3">
                  <p>
                    <span className="font-semibold text-[#2B2B55]">
                      How He Serves You
                    </span>
                  </p>

                  <p>
                    <span className="font-semibold">Consultations:</span> From
                    General to Instant, voice or video, every tier is designed
                    for focused, actionable insight.
                  </p>

                  <p>
                    <span className="font-semibold">Products & Kits:</span>{" "}
                    Digital wallpapers, goddess imagery, Shri Yantras — each
                    crafted with spiritual integrity and modern design
                    sensibility.
                  </p>

                  <p>
                    <span className="font-semibold">Courses & Trainings:</span>{" "}
                    Whether you want to decode charts for yourself or teach
                    others, his courses offer structured, deep-dive content with
                    corporate-tech polish.
                  </p>

                  <p>
                    <span className="font-semibold">Thought Leadership:</span>{" "}
                    Through webinars, podcasts, social media and articles, Astro
                    Sushil shares not just predictions but philosophies — how
                    dharma, destiny and data converge.
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex justify-center lg:justify-end sm:pl-10"
            >
              <img
                src="/Image/mandala-poster.webp"
                alt="Mandala"
                className="w-full h-full object-contain animate-spin [animation-duration:8s]"
              />
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}

export default AboutUs;
