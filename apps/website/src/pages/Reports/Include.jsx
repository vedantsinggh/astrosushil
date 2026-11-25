/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "/Image/Service/In-Person.png",
    title: "Love Compatibility & Relationship Insights",
    description:
      "Explore your emotional tendencies, attachment style, and how you connect in relationships. Discover compatibility patterns, potential challenges, and what influences your love life.",
  },
  {
    icon: "/Image/Service/Wristwatch.png",
    title: "Career Growth & Success Path",
    description:
      "Gain clear direction on whether a job, business, or independent path aligns best with your strengths. Understand your potential for success in government roles and competitive exams.",
  },
  {
    icon: "/Image/Service/LogoBrand.png",
    title: "Wealth & Prosperity Guidance",
    description:
      "Gain a clear understanding of your income patterns, savings potential, and financial growth opportunities. Identify hidden obstacles affecting your wealth and learn the right timing for investments and decisions.",
  },
  {
    icon: "/Image/Service/OnlineVastu.png",
    title: "Prosperity & Life Comforts",
    description:
      "Discover the periods when financial growth and asset accumulation are most favorable. Gain insights into opportunities for acquiring property, vehicles, and enhancing your lifestyle.",
  },
  {
    icon: "/Image/Service/Age.png",
    title: "Holistic Health & Wellness Guidance",
    description:
      "Discover your natural health tendencies and emotional balance through planetary influences. Gain insights into potential health patterns and areas that need attention.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
};

export function ServiceCard({ feature }) {
  return (
    <div className="relative pt-10 pb-7 h-full">  {/* h-full add kiya */}
      <div className="absolute left-4 top-2 z-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center">
        <img
          src={feature.icon}
          alt={feature.title}
          className="h-full w-full object-contain"
        />
      </div>

      <motion.div
        variants={cardVariants}
        className="flex flex-col bg-secondary rounded-2xl shadow px-5 sm:px-6 pt-12 pb-10 h-full transition-all duration-300"
      >
        <h3 className="mb-3 mt-6 text-start text-lg sm:text-xl font-bold leading-snug text-gold">
          {feature.title}
        </h3>
        <p className="text-start text-sm leading-relaxed text-black/80">
          {feature.description}
        </p>
      </motion.div>
    </div>
  );
}

export default function Include() {
  const firstRow = FEATURES.slice(0, 3);
  const secondRow = FEATURES.slice(3);

  return (
    <section className="bg-white px-4 sm:px-8 lg:px-12 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <p className="text-sm font-bold tracking-[0.18em] uppercase text-primary mb-2.5">
          Kundali Report
        </p>
        <h2 className="text-[clamp(26px,4vw,40px)] font-bold text-primary leading-tight mx-auto mb-3">
          What's Included in Your <br />
          <span className="text-gold">Astrology Report</span>
        </h2>
      </motion.div>

      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col gap-0"
        >
          {/* Row 1 — 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
            {firstRow.map((feature, i) => (
              <ServiceCard key={i} feature={feature} />
            ))}
          </div>

          {/* Row 2 — 2 cards centered */}
          <div className="flex flex-wrap justify-center gap-x-8">
            {secondRow.map((feature, i) => (
              <div
                key={i + 3}
                className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]"
              >
                <ServiceCard feature={feature} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}