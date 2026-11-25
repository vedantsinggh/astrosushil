import { motion } from "framer-motion";
import PageHero from "./HeroPage";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: i * 0.15 },
  }),
};

function ThankYouPage({ type }) {
  const navigate = useNavigate();

  return (
    <>
      <PageHero
        title="Thankyou"
        subtitle="The extraordinary world of astrology, an ancient science that illuminates personality, purpose, and possibility. Every moment holds cosmic meaning"
      />

      <div className="max-w-7xl mx-auto px-5">
        <motion.div
          className="text-center my-10 lg:mb-14 flex flex-col items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-sm font-semibold uppercase tracking-[0.22em] text-primary block mb-3"
          >
            Thankyou
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-primary text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-tight"
          >
            Your Cosmic <span className="text-gold">Journey Begins</span>
          </motion.h2>

          {type === "consultation" && (
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-primary text-xl max-w-5xl mx-auto "
            >
              Thank you for booking your astrology consultation with us. Your
              appointment has been successfully confirmed, and the universe is
              already aligning powerful insights for your path ahead. Whether
              you seek clarity in career, love, relationships, finances, or
              personal growth, this session is designed to guide you with
              ancient wisdom and meaningful direction. Stay positive — your
              stars have a story to tell.
            </motion.p>
          )}

          {type === "product" && (
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-primary text-xl max-w-5xl mx-auto "
            >
              Thank you for booking your product with us. Your order has been
              successfully confirmed, and the universe is already aligning
              powerful insights for your path ahead. Whether you seek clarity in
              career, love, relationships, finances, or personal growth, this
              session is designed to guide you with ancient wisdom and
              meaningful direction. Stay positive — your stars have a story to
              tell.
            </motion.p>
          )}

          {type === "report" && (
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-primary text-xl max-w-5xl mx-auto "
            >
              Thank you for choosing our Kundli Report service. We appreciate
              your trust in us. Your personalized Kundli report is currently
              being prepared based on your birth details. Our experts are
              carefully analyzing planetary positions, houses, and key
              astrological influences to create a detailed and accurate report
              for you. You will receive your complete Kundli report within the
              next 2 days. Once ready, it will be shared with you through your
              registered contact details.
            </motion.p>
          )}

          {type === "contact" && (
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-primary text-xl max-w-5xl mx-auto "
            >
              Thank you for reaching out to Astro Sushil. We've received your
              message and our team will get back to you within 24–48 hours.
              In the meantime, feel free to explore our consultations, courses,
              and personalized reports.
            </motion.p>
          )}

          <motion.button
            variants={fadeUp}
            onClick={() => navigate("/")}
            className="mt-8 flex items-center gap-2 text-sm md:text-lg bg-primary text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-gold transition-all duration-700"
          >
            Back to Home <ChevronRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>

      {/* {type === "product" && (
        <div className="max-w-7xl mx-auto px-5">

        </div>
      )}

      {type === "consultation" && (
        <div className="max-w-7xl mx-auto px-5">
          
        </div>
      )} */}
    </>
  );
}

export default ThankYouPage;
