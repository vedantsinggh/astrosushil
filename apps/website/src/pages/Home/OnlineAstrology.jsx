/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: i * 0.15 },
  }),
};

export default function OnlineAstrology() {
  const navigate = useNavigate();

  return (
    <section className="relative w-full py-5 overflow-hidden ">
      <div className="max-w-7xl mx-auto px-5">
        <motion.div
          className="text-center mb-10 lg:mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-primary text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-tight"
          >
            Online Astrology Consultation with{" "}
            <span className="text-gold">Astro Sushil</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-4 text-primary text-xl max-w-5xl mx-auto "
          >
            Personalized answers within the comfort of your own home. Expert
            Kundli analysis directly to your phone or computer in an online
            session. These sessions are customized to address your specific
            issues of career stall-outs, marriage delays, business stress and
            personal doubts. Astro Sushil delves into your birth chart,
            identifies the root causes of your difficult times, points out event
            timings and provides you with practical remedies that work for you.
          </motion.p>

          <motion.button
            variants={fadeUp}
            custom={3}
            whileTap={{ scale: 0.97 }}
            className="mt-5 px-7 py-2.5 bg-primary text-white text-sm sm:text-base font-medium rounded-lg hover:bg-gold transition-colors duration-700 cursor-pointer "
            aria-label="Read more about Astro Sushil Kumar Singh"
            onClick={() => navigate("/online-consultations")}
          >
            Book Online Consultation{" "}
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
