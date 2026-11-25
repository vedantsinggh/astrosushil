/* eslint-disable no-unused-vars */
import { useState, useRef } from "react";
import { Sparkles, MapPin, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAstrologyStore } from "../../store/useAstrologyStore";
import FaqSection from "../Faqs/Faqsection";

const WHY_CHOOSE_US = [
  {
    id: 1,
    title: "Original Mathematical Calculations",
    description:
      "Our algorithm is based on the basic principle of Vedic Ephemeris (Lahiri Ayanamsa), where the house divisions and the planetary degree positions are calculated correctly without any error in the calculation.",
  },
  {
    id: 2,
    title: "Simple, Jargon-Free Explanations",
    description:
      "Astrological language can be daunting, and this is why the explanations are simple and easy to follow. The Sanskrit terms used in Astro Sushil Free Kundali are translated into language made easy, simple, and understandable to the listener.",
  },
  {
    id: 3,
    title: "100% Privacy Guaranteed",
    description:
      "Personal birth data and created reports are kept highly confidential. We do not sell or leak your data to third parties.",
  },
  {
    id: 4,
    title: "No Hidden Fees",
    description:
      "Generating your basic Janam Kundli online on our platform is completely free. No mandatory credit card details, no surprise paywalls mid-way.",
  },
];

function NumberBadge({ n }) {
  return (
    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg shrink-0 z-10">
      <span className="font-heading text-black text-lg font-bold leading-none">
        {n}
      </span>
    </div>
  );
}

function WhyChooseCard({ feature, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
      className="relative bg-white/6 border border-white/20 rounded-lg p-5 sm:p-6
                  backdrop-blur-xl hover:bg-white/10 hover:border-gold/20 overflow-hidden
                  transition-all duration-300 group"
    >
      <NumberBadge n={feature.id} />

      <h3 className="font-heading text-gold text-base sm:text-lg leading-snug mb-2 pr-6 transition-colors duration-300">
        {feature.title}
      </h3>

      <p className="text-white text-sm font-body leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

const READING_GUIDE = [
  {
    title: "1st House (Ascendant)",
    description:
      "Found at the top center diamond box of your chart; sets your core personality.",
  },
  {
    title: "Moon Sign",
    description:
      "Locates your Moon (Mo) placement to highlight your emotional tendencies.",
  },
  {
    title: "Dominant Planets",
    description:
      "Look for clusters of planets, which point to where your main efforts will concentrate.",
  },
  {
    title: "Active Dasha",
    description:
      "Note your major planetary era—such as Jupiter for growth or Saturn for discipline.",
  },
];

const HOW_TO_STEPS = [
  {
    title: "Step 1",
    description: "Scroll up to our chart generation tool.",
  },
  {
    title: "Step 2",
    description: "Enter the real name, gender, date, time, and place of birth.",
  },
  {
    title: "Step 3",
    description: 'Click on the "Generate My Free Kundli" button.',
  },
  {
    title: "Step 4",
    description:
      "See your detailed birth chart, house positions, and planetary breakdowns at your fingertips on your screen in seconds.",
  },
];

const KUNDLI_FAQS = [
  {
    question: "Is Astro Sushil's Free Online Kundli 100% accurate?",
    answer:
      "Yes! The chart will be mathematically correct as long as your birth inputs — date, exact time, and location — are accurate.",
  },
  {
    question: "What if I don't know my exact birth time?",
    answer:
      "You can still create a general solar chart (Surya Kundli). For precise house divisions and Dasha timelines, accurate birth time is vital. Astro Sushil offers specialized Birth Time Rectification (BTR) services if needed.",
  },
  {
    question: "Can I generate a Free Kundli for marriage compatibility?",
    answer:
      "Yes! After generating individual charts on Astro Sushil, you can compare planetary placements and check partner compatibility in our matching section.",
  },
  {
    question: "Are the suggested remedies expensive?",
    answer:
      "No. Astro Sushil is not in favor of costly rituals but adopts simple and ethical solutions like lifestyle changes, mantra chanting, and meditation.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const inputClass =
  "w-full border rounded-md px-4 py-3 text-sm text-black placeholder:text-black/30 bg-white focus:outline-none focus:ring transition-all duration-200";
const labelClass =
  "block text-sm font-medium text-primary mb-1.5 tracking-wide";

function formatDob(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

// ─── Validation Rules ────────────────────────────────────────────────────────
function validateForm(form) {
  const errors = {};

  // Name — required, min 2 chars, letters + spaces only
  if (!form.name.trim()) {
    errors.name = "Name is required.";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) {
    errors.name = "Name can only contain letters and spaces.";
  }

  // Date of Birth — required, not a future date
  if (!form.dob) {
    errors.dob = "Date of birth is required.";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(form.dob);
    if (selected > today) {
      errors.dob = "Date of birth cannot be in the future.";
    }
  }

  // Birth Time — required
  if (!form.time) {
    errors.time = "Birth time is required.";
  }

  // Birth Place — required AND must have been selected from dropdown (lat/lng set)
  if (!form.place.trim()) {
    errors.place = "Birth place is required.";
  } else if (!form.latitude || !form.longitude) {
    errors.place = "Please select a place from the suggestions.";
  }

  // Gender — required
  if (!form.gender) {
    errors.gender = "Please select a gender.";
  }

  return errors;
}

// ─── Field border helper ─────────────────────────────────────────────────────
function fieldBorder(error, valid) {
  if (error) return "border-red-400 focus:border-red-400 focus:ring-red-100";
  if (valid)
    return "border-green-400 focus:border-green-400 focus:ring-green-100";
  return "border-secondary focus:border-primary focus:ring-primary";
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <AnimatePresence>
      <motion.p
        key={msg}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
      >
        <span>⚠</span> {msg}
      </motion.p>
    </AnimatePresence>
  );
}

export function GenerateKundliForm() {
  const navigate = useNavigate();
  const { generateKundli, getGeoDetails, loading } = useAstrologyStore();

  const [form, setForm] = useState({
    name: "",
    dob: "",
    time: "",
    gender: "",
    place: "",
    latitude: "",
    longitude: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false); // track first submit attempt
  const [suggestions, setSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  const revalidate = (updatedForm) => {
    if (!submitted) return;
    setErrors(validateForm(updatedForm));
  };

  const set = (k) => (e) => {
    const updated = { ...form, [k]: e.target.value };
    setForm(updated);
    revalidate(updated);
  };

  const handlePlaceChange = (e) => {
    const val = e.target.value;
    const updated = { ...form, place: val, latitude: "", longitude: "" };
    setForm(updated);
    setSuggestions([]);
    setShowDropdown(false);
    revalidate(updated);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true);
      const res = await getGeoDetails({ place: val.trim() });
      setGeoLoading(false);
      if (res.success && res.data?.length) {
        setSuggestions(res.data);
        setShowDropdown(true);
      }
    }, 400);
  };

  const handleSelect = (item) => {
    const updated = {
      ...form,
      place: item.formattedAddress,
      latitude: String(item.location.latitude),
      longitude: String(item.location.longitude),
    };
    setForm(updated);
    setShowDropdown(false);
    setSuggestions([]);
    revalidate(updated);
  };

  const handleSubmit = async () => {
    // alert("This feature will enable soon")
    // return null;
    setSubmitted(true);
    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    // Stop if any errors
    if (Object.keys(validationErrors).length > 0) return;

    const [hour = "0", min = "0"] = (form.time || "00:00").split(":");

    const params = {
      name: form.name,
      place: form.place,
      latitude: form.latitude || "28.6139",
      longitude: form.longitude || "77.2090",
      dob: formatDob(form.dob),
      hour: parseInt(hour),
      min: parseInt(min),
      label:
        "astro_details,basic_panchang,planets,manglik,kalsarpa_details,pitra_dosha_report,sadhesati_current_status,vimshottri_antar_vdasha",
    };

    const res = await generateKundli(params);
    if (res.success) navigate("/kundli/report");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <motion.div
      variants={fadeUp}
      custom={0}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="bg-white  p-8"
    >
      <div className="text-center mb-8">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
          Kundli System
        </p>
        <h2 className="font-heading text-4xl font-bold text-primary mb-3">
          Enter Your Details to Generate{" "}
          <span className="text-gold">Your Free Kundli</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed">
          Please enter your exact birth details below. Accurate time and
          location ensure maximum precision in your chart calculations.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {/* Zodiac image */}
        <div className="flex-1 mx-auto sm:mx-0">
          <div className="w-full h-[90%] rounded-2xl overflow-hidden border border-secondary/20 shadow-sm bg-secondary/10 flex items-center justify-center">
            <img
              src="/Image/kundli-zodiac.webp"
              alt="Zodiac wheel"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="text-primary/20 text-6xl font-heading select-none absolute">
              ✦
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="flex-1 w-full space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Enter Name"
              className={`${inputClass} ${fieldBorder(errors.name, false)}`}
            />
            <FieldError msg={errors.name} />
          </div>

          {/* Date of Birth */}
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={set("dob")}
              max={todayStr}
              className={`${inputClass} ${fieldBorder(errors.dob, false)}`}
            />
            <FieldError msg={errors.dob} />
          </div>

          {/* Birth Time */}
          <div>
            <label className={labelClass}>Birth Time</label>
            <input
              type="time"
              value={form.time}
              onChange={set("time")}
              className={`${inputClass} ${fieldBorder(errors.time, false)}`}
            />
            <FieldError msg={errors.time} />
          </div>

          {/* Birth Place */}
          <div className="relative">
            <label className={labelClass}>Birth Place</label>
            <div className="relative">
              <input
                type="text"
                value={form.place}
                onChange={handlePlaceChange}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Search city or place..."
                className={`${inputClass} pr-9 ${fieldBorder(errors.place, !!form.latitude)}`}
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {geoLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : form.latitude ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-black/25" />
                )}
              </div>
            </div>
            <FieldError msg={errors.place} />

            {/* Dropdown */}
            <AnimatePresence>
              {showDropdown && suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 w-full mt-1.5 bg-white border border-[#e0d9f5] rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto"
                >
                  {suggestions.map((item, i) => (
                    <li
                      key={i}
                      onMouseDown={() => handleSelect(item)}
                      className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-secondary/40 cursor-pointer border-b border-[#f3f0fb] last:border-0 transition-colors"
                    >
                      <MapPin className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                      <span className="text-xs text-black/70 leading-relaxed">
                        {item.formattedAddress}
                      </span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* Gender */}
          <div>
            <label className={labelClass}>Gender</label>
            <select
              value={form.gender}
              onChange={set("gender")}
              className={`${inputClass} cursor-pointer ${fieldBorder(errors.gender, false)}`}
            >
              <option value="" disabled>
                Select Gender
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <FieldError msg={errors.gender} />
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={loading}
          className="px-10 py-3 bg-primary text-white font-medium text-base rounded-md transition-all duration-700 hover:bg-gold cursor-pointer flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed capitalize"
        >
          {/* <Sparkles className="w-4 h-4" /> */}
          {loading ? "Generating..." : "GENERATE MY FREE KUNDLI"}
        </motion.button>
      </div>

      {/* ── What is a Kundli ── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-20 sm:mt-24"
      >
        <h3 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          What is a Kundli and Why Does It{" "}
          <span className="text-gold">Matter?</span>
        </h3>
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-sm sm:text-lg text-black leading-relaxed">
            A Kundli, or birth chart, is the picture of the sky that is drawn at
            the time and place of your birth.{" "}
            <Link className="underline font-medium text-gold" to="/">
              Vedic astrology
            </Link>{" "}
            uses the placement of the Sun, Moon, and planets to determine your
            nature, your problems, and your fate.
          </p>
          <p className="text-sm sm:text-lg text-black leading-relaxed">
            The free kundli at Astro Sushil can help you understand how twelve
            cosmic houses (Bhavas) interact with nine major celestial bodies
            (Grahas). Your chart is your guide for clarity, revealing why some
            patterns will repeat and giving you the power of making wiser
            choices in career, health, money, and personal relationships.
          </p>
        </div>
      </motion.section>

      {/* ── Why Choose Astro Sushil (same treatment as the About Us page) ── */}
      <section
        aria-labelledby="kundli-why-choose-heading"
        className="relative w-full overflow-hidden py-16 sm:py-20 lg:py-24 mt-20 sm:mt-24"
      >
        <img
          src="/Image/about-bg.webp"
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
              id="kundli-why-choose-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-heading text-white text-3xl sm:text-4xl leading-tight"
            >
              Why Choose Astro Sushil for Your{" "}
              <span className="text-gold">Online Kundali Making?</span>
              {/* Why Choose <span className="text-gold">Astro Sushil?</span> */}
            </motion.h2>
            <p className="text-sm sm:text-lg text-white max-w-4xl mx-auto leading-relaxed">
              There are hundreds of Astrology websites that you can find online;
              why are you here with us? At{" "}
              <Link
                className="underline font-medium text-gold"
                to="/online-consultations"
              >
                Astro Sushil
              </Link>
              , we blend the ultimate mathematical accuracy with humanistic,
              practical, and comprehensive astrological insight.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-12">
            {WHY_CHOOSE_US.map((feature, i) => (
              <WhyChooseCard
                key={feature.id}
                feature={feature}
                delay={i * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Read Your Kundli ── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-20 sm:mt-24"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          How to Read Your Kundli: A Practical{" "}
          <span className="text-gold">Beginner's Guide</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10">
          Reading a{" "}
          <Link
            className="underline font-medium text-gold"
            to="/personalized-astrology-reports"
          >
            horoscope
          </Link>{" "}
          is simple once you break down these four core elements:
        </p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {READING_GUIDE.map(({ title, description }, i) => (
            <div key={title} className="flex items-start gap-4 group">
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-sm z-10">
                {i + 1}
              </span>
              <h3 className="text-sm text-black/80 leading-relaxed pt-0.5">
                <span className="font-bold text-primary group-hover:text-gold">
                  {title}:{" "}
                </span>
                {description}
              </h3>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Step-by-Step ── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-20 sm:mt-24"
      >
        <h3 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Step-by-Step: How to Use Our{" "}
          <span className="text-gold">Free Kundli Tool</span>
        </h3>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10 text-center">
          It only takes you a couple of minutes to create your horoscope report
          on our platform:
        </p>

        <div className="max-w-2xl mx-auto flex flex-col gap-1">
          {HOW_TO_STEPS.map(({ title, description }, i) => (
            <div key={title} className="flex items-start gap-4">
              <div className="relative flex flex-col items-center shrink-0">
                <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-sm z-10">
                  {i + 1}
                </span>
                {i !== HOW_TO_STEPS.length - 1 && (
                  <span className="absolute top-8 w-px h-full min-h-10 border-l-2 border-dashed border-gold" />
                )}
              </div>
              <p className="text-sm sm:text-base text-black/80 leading-relaxed pb-5">
                {description}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── FAQs ── */}
      <div className="mt-8 -mx-8">
        <FaqSection faqs={KUNDLI_FAQS} />
      </div>

      {/* ── Closing CTA ── */}
      {/* <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary via-[#2f3357] to-primary px-6 py-12 sm:py-16 text-center -mx-8 sm:mx-0"
      >
        <p className="text-gold text-xs sm:text-sm tracking-widest uppercase font-body mb-3">
          Your Journey Starts Here
        </p>
        <h3 className="font-heading text-2xl sm:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
          Take the First Step Toward Clarity Today
        </h3>
        <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto leading-relaxed mb-8">
          Don't leave your major decisions to guesswork. Generate a reliable,
          detailed Free Online Kundli with Astro Sushil today and take
          confident control of your future using timeless Vedic wisdom!
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="px-8 py-3 bg-gold text-primary font-heading font-bold text-sm rounded-md transition-all duration-700 hover:bg-white cursor-pointer inline-flex items-center gap-2 shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          Generate My Free Kundli Now
        </motion.button>
      </motion.section> */}
    </motion.div>
  );
}
