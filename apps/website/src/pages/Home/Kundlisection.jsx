/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import { FileText, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

export default function KundliSection() {
  const navigate = useNavigate();

  return (
    <section
      aria-labelledby="kundli-heading"
      className="w-full relative bg-white py-8 sm:py-10 lg:py-12"
    >
      <div className="max-w-7xl mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
          <div className="flex flex-col items-start gap-5">
            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              className="text-primary w-full flex justify-center items-center  text-center text-sm sm:text-base tracking-widest uppercase  font-semibold"
            >
              Kundli &amp; Report
            </motion.p>

            <motion.h2
              id="kundli-heading"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0.1}
              className="font-heading text-center text-primary text-3xl sm:text-4xl lg:text-[2.6rem] xl:text-5xl"
            >
              Trusted Kundli
              <span className="text-gold "> by Matching </span>
              <span className="text-gold">Experts</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0.2}
              className="text-black/65 text-sm sm:text-xl text-center max-w-4xl mx-auto"
            >
              Where Numbers Reveal Your Destiny uncovers the hidden meaning
              behind your birth numbers and name vibrations. Our expert
              numerologists provide personalized insights into your personality,
              life path, and future opportunities. Use the power of numbers to
              make confident decisions and align with your true potential.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0.3}
              className="flex flex-col items-center justify-center w-full sm:flex-row flex-wrap gap-3 sm:gap-4 pt-5"
            >
              <button
                onClick={() => navigate("/free-online-kundli")}
                type="button"
                className="
                  inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary
                  text-white text-base font-medium
                  hover:bg-gold  cursor-pointer hover:text-white
                  active:scale-[0.98] transition-colors duration-700
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40
                  whitespace-nowrap
                "
                aria-label="Generate Kundli Report"
              >
                {/* <FileText size={15} aria-hidden="true" /> */}
                Generate Kundli Report
              </button>

              <button
                type="button"
                className="
                  inline-flex items-center gap-2 px-6 py-3
                  bg-primary rounded-lg font-medium
                  text-white  cursor-pointer text-base font-body  
                  hover:brightness-110 active:scale-[0.98]
                  transition-colors duration-700
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60
                  whitespace-nowrap hover:bg-gold hover:text-white
                "
                aria-label="Chat with Astrologer for Kundli Matching"
                onClick={() => navigate("/kundli-matching")}
              >
                {/* <MessageCircle size={15} aria-hidden="true" /> */}
                Match your Kundli
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.88, rotate: -6 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <div
              className="
                relative w-72 h-72
                sm:w-80 sm:h-80
                lg:w-96 lg:h-96
                xl:w-104 xl:h-104
              "
            >
              <div
                className="
                  absolute inset-0 rounded-full
                  bg-gold/10 blur-2xl scale-90
                "
                aria-hidden="true"
              />

              <img
                src="/Image/mandala-poster.webp"
                alt="Mandala"
                loading="lazy"
                decoding="async"
                width={400}
                height={400}
                className="w-full h-full object-contain animate-spin [animation-duration:8s]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
