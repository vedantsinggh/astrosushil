/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import PageHero from "../../components/HeroPage";
import { GenerateKundliForm } from "./KundliGenerate";
import { useNavigate } from "react-router-dom";
import Seo from "../../components/Seo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

function KundliMatchCard() {
  const navigate = useNavigate();
  return (
    <motion.div
      variants={fadeUp}
      custom={1}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="bg-white p-8 text-center"
    >
      <h3 className="font-heading text-4xl font-bold text-primary mb-3">
        Kundli <span className="text-gold">Match</span>
      </h3>
      <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-8">
        Enter your birth details to generate your personalised Kundli and
        discover deep Vedic insights about your life, career, relationships, and
        future opportunities.
      </p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        className="px-10 py-3 bg-primary text-white hover:bg-gold cursor-pointer font-medium text-sm rounded-md transition-all duration-700 flex items-center gap-2 mx-auto"
        onClick={() => navigate("/kundli-matching")}
      >
        {/* <Star className="w-4 h-4" /> */}
        Match Your Kundli
      </motion.button>
    </motion.div>
  );
}

export default function KundliPage() {
  return (
    <>
      <Seo page="kundli" />
      <PageHero
        title="Free Online Kundli | Accurate Janam Kundli Analysis by Astro Sushil Kumar Singh"
        highlight="Free Online Kundli"
        subtitle="Whether you're navigating career, marriage, or personal growth, your birth chart holds the blueprint to your journey Astro Sushil makes Vedic wisdom effortless with our accurate Free Online Kundli tool, giving you a fast, reliable janam kundli online reading right from home in just a few clicks."
        ctaBtn="Talk to Astrologer Sushil Kumar Singh"
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Kundli",
            href: "/free-online-kundli",
          },
        ]}
      />
      <section className=" bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6  mb-12">
          <GenerateKundliForm />
          <KundliMatchCard />
        </div>
      </section>
    </>
  );
}
