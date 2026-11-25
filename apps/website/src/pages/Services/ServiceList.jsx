/* eslint-disable no-unused-vars */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SERVICES = [
  {
    id: "in-person",
    icon: "/Image/Service/In-Person.png",
    title: "In-Person Meeting",
    description:
      "Astrosushil deciphers the cosmic forces shaping your destiny with deep, personalised guidance.",
    bullets: [
      "Marriage & Relationship Guidance",
      "Career & Business Decisions",
      "Legal & Relocation Timing",
    ],
    cta: "Book Appointment",
  },
  {
    id: "wristwatch",
    icon: "/Image/Service/Wristwatch.png",
    title: "Wristwatch Analysis",
    description:
      "A detailed wrist-watch analysis to align your timepiece with planetary energies.",
    bullets: [
      "Personalised timing analysis",
      "Planetary energy alignment",
      "Enhanced daily productivity",
    ],
    cta: "Book Appointment",
  },
  {
    id: "logo",
    icon: "/Image/Service/LogoBrand.png",
    title: "Logo/Brand Vastu Review",
    description:
      "A detailed review of your brand's energy alignment for better results.",
    bullets: [
      "Brand energy analysis",
      "Alignment with planetary forces",
      "Growth-focused recommendations",
    ],
    cta: "Book Appointment",
  },
  {
    id: "online-vastu",
    icon: "/Image/Service/OnlineVastu.png",
    title: "Online Vastu Consultation",
    description:
      "Receive personalised vastu recommendations through online consultation.",
    bullets: [
      "Home/office energy analysis",
      "Virtual consultation",
      "Detailed correction plan",
    ],
    cta: "Book Appointment",
  },
  {
    id: "longevity",
    icon: "/Image/Service/Age.png",
    title: "Age Longevity",
    description:
      "Specialised pooja and remedies tailored for life milestones and longevity.",
    bullets: [
      "Personalised rituals",
      "Planetary remedies",
      "Spiritual guidance",
    ],
    cta: "Book Appointment",
  },
  {
    id: "remedies",
    icon: "/Image/Service/DivinePooja.png",
    title: "Divine Pooja & Remedies",
    description: "Custom pooja and remedies aligned with your birth chart.",
    bullets: [
      "Personalised rituals",
      "Planetary remedies",
      "Spiritual guidance",
    ],
    cta: "Book Appointment",
  },
  {
    id: "consultation",
    icon: "/Image/Service/Consultation.png",
    title: "Consultation",
    description:
      "Specialised pooja and effective remedies tailored for every problem.",
    bullets: [
      "Personalised rituals",
      "Planetary remedies",
      "Spiritual guidance",
    ],
    cta: "Book Appointment",
  },
  {
    id: "reports",
    icon: "/Image/Service/Reports.webp",
    title: "Reports",
    description:
      "Detailed astrology reports tailored for relationships, career, and more.",
    bullets: [
      "Personalised rituals",
      "Planetary remedies",
      "Spiritual guidance",
    ],
    cta: "Book Appointment",
  },
  {
    id: "products",
    icon: "/Image/Service/Products.png",
    title: "Products",
    description:
      "Carefully designed Vedic products to bring harmony and positive energy.",
    bullets: [
      "Daily affirmation wallpapers",
      "Yantra-based designs",
      "Positive energy enhancement",
    ],
    cta: "Buy Now",
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

export function ServiceCard({ service }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative pt-10 pb-7">
      <div className="absolute -left-4 sm:-left-6 top-2 z-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center">
        <img
          src={service.icon}
          alt={service.title}
          className="h-full w-full object-contain"
        />
      </div>

      <motion.div
        variants={cardVariants}
        className="flex flex-col bg-secondary/40 rounded-2xl shadow px-5 sm:px-6 pt-12 pb-16 h-full transition-all duration-300"
      >
        <h3 className="mb-3 text-center text-lg sm:text-xl font-bold leading-snug text-gold">
          {service.title}
        </h3>

        <p className="mb-5 text-center text-[13px] leading-relaxed text-gray-500">
          {service.description}
        </p>

        <ul className="flex flex-col gap-3 mt-auto">
          {service.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[13px] text-gray-700"
            >
              <CheckCircle
                size={18}
                strokeWidth={1.6}
                className="shrink-0 mt-0.5 text-primary"
              />
              {b}
            </li>
          ))}
        </ul>
      </motion.div>

      <button
        onClick={() => navigate("/book-appointment")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 flex w-[calc(100%-32px)] sm:w-[calc(100%-48px)] items-center justify-between text-sm bg-primary hover:bg-gold text-white cursor-pointer rounded-xl px-4 sm:px-6 py-3.5 sm:py-4 font-bold shadow-lg transition-all duration-200"
      >
        <span className="truncate">{service.cta}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 ml-2">
          <ArrowRight size={15} strokeWidth={2.5} color="#fff" />
        </span>
      </button>
    </div>
  );
}

export default function ServicesGrid() {
  return (
    <section className="bg-white px-4 sm:px-8 lg:px-12 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-gold mb-2.5">
          What We Offer
        </p>
        <h2 className="text-[clamp(26px,4vw,40px)] font-bold text-primary leading-tight mx-auto mb-3">
          Our Services & <span className="text-gold">Offerings</span>
        </h2>
        <p className="text-sm sm:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          From deep Vedic consultations to sacred products — everything you need
          for clarity, direction, and spiritual alignment.
        </p>
      </motion.div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          // 1 col mobile → 2 col tablet → 3 col desktop
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6"
        >
          {SERVICES.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
