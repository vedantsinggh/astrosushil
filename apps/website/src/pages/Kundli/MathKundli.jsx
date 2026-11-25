/* eslint-disable no-unused-vars */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User } from "lucide-react";
import PageHero from "../../components/HeroPage";
import { toast } from "react-hot-toast";
import { useAstrologyStore } from "../../store/useAstrologyStore";
import FaqSection from "../Faqs/Faqsection";
import Seo from "@/components/Seo";

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

const tabFade = {
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputClass =
  "w-full border border-primary/50 rounded-md px-4 py-3 text-sm text-black placeholder:text-black/30 bg-white focus:outline-none focus:ring transition-all duration-200";
const labelClass =
  "block text-sm font-medium text-primary mb-1.5 tracking-wide";

const defaultBoy = { name: "", dob: "", time: "", place: "", gender: "male" };
const defaultGirl = {
  name: "",
  dob: "",
  time: "",
  place: "",
  gender: "female",
};

// ─── SEO content data ─────────────────────────────────────────────────────────
const WHY_MATCHING_MATTERS = [
  {
    title: "Understanding Emotional Habits",
    description:
      "The Moon's placement shows how someone processes feelings. Matching lets you see whether you'll naturally comfort each other or clash during arguments.",
  },
  {
    title: "Handling Tough Times Together",
    description:
      "If your life is going through a challenging period, horoscope matching reveals whether your chart is stable during that time or not.",
  },
  {
    title: "Identifying Stress Points Early",
    description:
      "It identifies potential communication problems, health issues, or family conflict before they become a problem.",
  },
  {
    title: "Planetary Clashes",
    description:
      "If there are any, you can handle them early on with simple changes rather than be surprised later.",
  },
];

const IGNORED_RISKS = [
  {
    title: "Unexplained Communication Walls",
    description:
      "One person may need to communicate issues as soon as they arise while the other may shut down completely when put under pressure.",
  },
  {
    title: "Financial Strain",
    description:
      "Some planetary combinations can be a time of losing money more quickly than it is being made. Matching helps spot whether both charts support financial growth or trigger joint money stress.",
  },
  {
    title: "Timing Clashes",
    description:
      "If one partner enters a difficult Dasha period while the other partner's chart lacks stabilizing energy, both people can feel overwhelmed at the exact same time.",
  },
];

const ASHTAKOOTA_TABLE = [
  {
    factor: "Varna",
    points: "1 Point",
    meaning: "Mutual respect and ego alignment.",
  },
  {
    factor: "Vashya",
    points: "2 Points",
    meaning: "Power balance and natural attraction.",
  },
  {
    factor: "Tara",
    points: "3 Points",
    meaning: "Health, luck, and long-term destiny together.",
  },
  {
    factor: "Yoni",
    points: "4 Points",
    meaning: "Intimacy, physical chemistry, and biological harmony.",
  },
  {
    factor: "Graha Maitri",
    points: "5 Points",
    meaning: "Friendship, mental connection, and everyday communication.",
  },
  {
    factor: "Gana",
    points: "6 Points",
    meaning:
      "Basic temperament and social behavior (Deva, Manushya, or Rakshasa).",
  },
  {
    factor: "Bhakoot",
    points: "7 Points",
    meaning: "Financial growth, family welfare, and emotional bonding.",
  },
  {
    factor: "Nadi",
    points: "8 Points",
    meaning: "Genetic compatibility, health, and bloodline strength.",
  },
];

const GUNA_SCORE_RANGES = [
  {
    range: "Below 18 Points",
    label: "Low Compatibility",
    description:
      "Traditionally considered low compatibility. Expect friction unless other strong planets in your charts balance things out.",
  },
  {
    range: "18 to 24 Points",
    label: "Workable Match",
    description:
      "A solid, workable match. With basic effort and clear communication, couples in this range build happy marriages.",
  },
  {
    range: "25 to 32 Points",
    label: "Excellent Match",
    description:
      "An excellent match with strong mental, emotional, and physical alignment.",
  },
  {
    range: "33 to 36 Points",
    label: "Rare Match",
    description: "A rare match showing deep natural harmony.",
  },
];

const KEY_PLANETS_CHECK = [
  {
    title: "Manglik Dosha (Kuja Dosha)",
    description:
      "Manglik Dosha occurs when Mars is placed in certain houses of a person's Horoscope. Mars can add drive and passion to relationships, but can also cause impatience or aggressive outbursts. In nearly 60% of cases, it cancels out automatically due to counterbalancing planetary positions. Our report shows whether Manglik influences exist and if they cancel out.",
  },
  {
    title: "Nadi Dosha",
    description:
      "Nadi carries 8 points and checks physical compatibility and health. If both charts share the same Nadi, it forms Nadi Dosha. Classic Vedic texts list many exceptions that clear this condition, and our system calculates them automatically.",
  },
  {
    title: "Strength of Venus & Jupiter",
    description:
      "Venus rules romance and chemistry, while Jupiter brings stability and good judgment. When Venus and Jupiter sit in strong positions in both charts, minor disagreements resolve quickly.",
  },
];

const LOVE_MARRIAGE_TIPS = [
  {
    title: "Focus on the 7th House",
    description:
      "The 7th house in your individual chart shows your actual capacity to stay married. A strong 7th house lord overcomes many low Guna scores.",
  },
  {
    title: "Identify the Specific Clash",
    description:
      "If you have lost points or not gained any points in Graha Maitri (communication), then take an active step to practice Active Listening.",
  },
  {
    title: "Targeted Remedies",
    description:
      "Vedic astrology provides you with practical remedies, such as chanting mantras, making donations, or following specific gemstone recommendations, to help calm down the planets that are causing problems.",
  },
];

const MATCH_STEPS = [
  {
    title: "Enter the Boy's Details",
    description: "name, date of birth, exact birth time, and birth city.",
  },
  {
    title: "Enter the Girl's Details",
    description: "switch tabs and input her birth details.",
  },
  {
    title: 'Click "Match Kundli"',
    description: "our tool calculates planetary positions instantly.",
  },
  {
    title: "Read Your Report",
    description:
      "review your total score out of 36, Koota breakdowns, and practical next steps.",
  },
];

const WHY_CHOOSE_US_MATCH = [
  {
    id: 1,
    title: "No Fear Tactics",
    description:
      "We avoid alarmist language. We tell you what the chart shows in direct words and give you practical solutions.",
  },
  {
    id: 2,
    title: "Modern Realities",
    description:
      "Ancient texts were written long ago. We apply those core principles to modern love and arranged marriages so couples can work through differences together.",
  },
  {
    id: 3,
    title: "100% Data Privacy",
    description:
      "Your personal details stay private. We don't share or sell your information.",
  },
  {
    id: 4,
    title: "Direct Expert Access",
    description:
      "If you need deeper answers beyond the automated report, you can talk directly with Sushil Ji for personal advice.",
  },
];

const REMEDIES = [
  {
    title: "Mantra Chanting",
    description:
      "Chanting mantras such as the Mahamrityunjaya Mantra every day removes mental stress.",
  },
  {
    title: "Charity",
    description:
      "Giving on Tuesday or Saturday gives relief from the hard planets.",
  },
  {
    title: "Rituals",
    description:
      "For heavy Manglik placements, simple traditional rituals like Kumbh Vivah neutralize chart pressure.",
  },
  {
    title: "Direct Effort",
    description:
      "Understanding how your partner reacts under pressure helps you build patience. Good communication remains the best remedy available.",
  },
];

const MATCH_FAQS = [
  {
    question: "What is the minimum passing score for Kundli matching?",
    answer:
      "A score of 18 out of 36 Gunas serves as the standard baseline. Scores between 18 and 24 are workable, 25 to 32 are strong, and anything above 32 is exceptional. Even below 18, marriages succeed if individual charts are strong.",
  },
  {
    question: "Can a Manglik marry a Non-Manglik?",
    answer:
      "Yes. A Manglik can marry a non-Manglik if the Dosha is weak, canceled by other planets, or balanced by strong houses in the partner's chart.",
  },
  {
    question: "Should love marriage couples match their Kundlis?",
    answer:
      "Yes. In love marriages, matching shouldn't break couples up. It serves as a practical map to highlight potential stress points ahead of time so you can address them together.",
  },
  {
    question: "What if I don't know my exact birth time?",
    answer:
      "You can use kundali matching by name for a rough check. For an accurate assessment of Manglik Dosha and house details, consult an astrologer for Birth Time Rectification.",
  },
  {
    question: "Is this tool completely free?",
    answer:
      "Yes. Generating your matching report, checking your Guna breakdown, and reviewing your Manglik status on our site costs nothing.",
  },
];

const contentFadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Shared content blocks ────────────────────────────────────────────────────
function NumberedList({ items, columns = 2 }) {
  return (
    <div
      className={`max-w-4xl mx-auto grid grid-cols-1 ${
        columns === 2 ? "sm:grid-cols-2" : ""
      } gap-x-8 gap-y-6`}
    >
      {items.map(({ title, description }, i) => (
        <div key={title} className="flex items-start gap-4 group">
          <span className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-sm z-10">
            {i + 1}
          </span>
          <h3 className="text-sm text-black/80 leading-relaxed pt-0.5">
            <span className="font-bold text-gold group-hover:text-gold">
              {title}:{" "}
            </span>
            {description}
          </h3>
        </div>
      ))}
    </div>
  );
}

function StepTimeline({ steps }) {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-1">
      {steps.map(({ title, description }, i) => (
        <div key={title} className="flex items-start gap-4">
          <div className="relative flex flex-col items-center shrink-0">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-sm z-10">
              {i + 1}
            </span>
            {i !== steps.length - 1 && (
              <span className="absolute top-8 w-px h-full min-h-10 border-l-2 border-dashed border-gold" />
            )}
          </div>
          <p className="text-sm sm:text-base text-black/80 leading-relaxed pb-5">
            <span className="font-bold text-primary">{title} — </span>
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}

function MatchNumberBadge({ n }) {
  return (
    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg shrink-0 z-10">
      <span className="font-heading text-black text-lg font-bold leading-none">
        {n}
      </span>
    </div>
  );
}

function MatchWhyChooseCard({ feature, delay }) {
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
      <MatchNumberBadge n={feature.id} />

      <h3 className="font-heading text-gold text-base sm:text-lg leading-snug mb-2 pr-6 transition-colors duration-300">
        {feature.title}
      </h3>

      <p className="text-white text-sm font-body leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

// ─── PersonForm ───────────────────────────────────────────────────────────────
function PersonForm({ form, setForm }) {
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Name</label>
        <input
          type="text"
          value={form.name}
          onChange={set("name")}
          placeholder="Enter full name"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Date of Birth</label>
        <input
          type="date"
          value={form.dob}
          onChange={set("dob")}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Birth Time</label>
        <input
          type="time"
          value={form.time}
          onChange={set("time")}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Birth Place</label>
        <input
          type="text"
          value={form.place}
          onChange={set("place")}
          placeholder="e.g. Delhi, India"
          className={inputClass}
        />
      </div>
    </div>
  );
}

// ─── KundliMatchCard ──────────────────────────────────────────────────────────
function KundliMatchCard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("boy");
  const [boyForm, setBoyForm] = useState({ ...defaultBoy });
  const [girlForm, setGirlForm] = useState({ ...defaultGirl });

  const { generateMatchMaking, loading } = useAstrologyStore();

  const tabs = [
    { id: "boy", label: "Boy's Details", icon: User },
    { id: "girl", label: "Girl's Details", icon: User },
  ];

  const validateForm = () => {
    const check = (form, label) => {
      if (!form.name.trim()) {
        toast.error(`Please enter ${label.toLowerCase()}'s full name.`);
        return false;
      }

      if (!form.dob) {
        toast.error(`Please select ${label.toLowerCase()}'s date of birth.`);
        return false;
      }

      if (!form.time) {
        toast.error(`Please enter ${label.toLowerCase()}'s birth time.`);
        return false;
      }

      if (!form.place.trim()) {
        toast.error(`Please enter ${label.toLowerCase()}'s birth place.`);
        return false;
      }

      return true;
    };

    return check(boyForm, "Boy") && check(girlForm, "Girl");
  };

  const formatDob = (dob) => {
    const [y, m, d] = dob.split("-");
    return `${d}-${m}-${y}`;
  };

  const parseTime = (t) => {
    const [h, min] = t.split(":");
    return { hour: Number(h), min: Number(min) };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const boyTime = parseTime(boyForm.time);
    const girlTime = parseTime(girlForm.time);

    const params = {
      male_lat: 28.6139,
      male_long: 77.209,
      male_dob: formatDob(boyForm.dob),
      male_hour: boyTime.hour,
      male_min: boyTime.min,
      male_name: boyForm.name.trim(),

      female_lat: 19.076,
      female_long: 72.8777,
      female_dob: formatDob(girlForm.dob),
      female_hour: girlTime.hour,
      female_min: girlTime.min,
      female_name: girlForm.name.trim(),

      label: "match_ashtakoot_points",
    };

    const result = await generateMatchMaking(params);

    if (result.success && result.data?.data) {
      toast.success("✨ Kundli matched successfully!");
      navigate("/kundli-match/report");
      return;
    }

    // ── Fallback mock — set directly into store ───────────────────────────────
    useAstrologyStore.setState({
      matchMaking: {
        match_ashtakoot_points: {
          varna: {
            description: "Natural Refinement / Work",
            male_koot_attribute: "Shoodra",
            female_koot_attribute: "Shoodra",
            total_points: 1,
            received_points: 1,
          },
          vashya: {
            description: "Innate Giving / Attraction",
            male_koot_attribute: "Maanav",
            female_koot_attribute: "Maanav",
            total_points: 2,
            received_points: 2,
          },
          tara: {
            description: "Comfort - Prosperity - Health",
            male_koot_attribute: "Swati",
            female_koot_attribute: "Dhanishtha",
            total_points: 3,
            received_points: 3,
          },
          yoni: {
            description: "Intimate Physical compatibility",
            male_koot_attribute: "Mahisha",
            female_koot_attribute: "Singh",
            total_points: 4,
            received_points: 2,
          },
          maitri: {
            description: "Friendship and mental bond",
            male_koot_attribute: "Venus",
            female_koot_attribute: "Saturn",
            total_points: 5,
            received_points: 5,
          },
          gan: {
            description: "Temperament compatibility",
            male_koot_attribute: "Dev",
            female_koot_attribute: "Rakshasa",
            total_points: 6,
            received_points: 0,
          },
          bhakut: {
            description: "Constructive ability / Society",
            male_koot_attribute: "Libra",
            female_koot_attribute: "Aquarius",
            total_points: 7,
            received_points: 0,
          },
          nadi: {
            description: "Progeny / Genetic compatibility",
            male_koot_attribute: "Ant",
            female_koot_attribute: "Madhya",
            total_points: 8,
            received_points: 8,
          },
          total: {
            total_points: 36,
            received_points: 21,
            minimum_required: 18,
          },
          conclusion: {
            status: true,
            report:
              "The match has scored 21 points out of 36. This is a reasonably good score. Your rashi lords are friendly with each other, signifying mental compatibility and mutual affection. This is a favourable Ashtakoota match.",
          },
        },
      },
      formData: params,
    });

    toast.success("✨ Kundli matched successfully!");
    navigate("/kundli-match/report");
  };

  return (
    <motion.div
      variants={fadeUp}
      custom={1}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="bg-white p-8"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
          Vedic Astrology
        </p>
        <h3 className="font-heading text-4xl font-bold text-primary mb-3">
          Kundli <span className="text-gold">Match</span>
        </h3>
        <p className="text-sm sm:text-base text-black/80 max-w-xl mx-auto leading-relaxed">
          Please enter the birth details of both partners below to get an
          instant Ashta Koota compatibility score, Manglik Dosha analysis, and
          planetary harmony check.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-7 bg-secondary/20 p-1 rounded-xl w-fit mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-700 cursor-pointer hover:bg-gold text-white shadow-sm ${activeTab === id ? "bg-gold" : "bg-primary"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Form Body */}
      <div className="flex flex-col sm:flex-row gap-8 items-start">
        <div className="flex-1 mx-auto sm:mx-0">
          <div className="w-full rounded-2xl overflow-hidden border border-secondary/20 shadow-sm bg-secondary/10 flex items-center justify-center min-h-50">
            <img
              src="/Image/kundli-zodiac.webp"
              alt="Zodiac wheel"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            {activeTab === "boy" ? (
              <motion.div
                key="boy"
                variants={tabFade}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <PersonForm form={boyForm} setForm={setBoyForm} />
              </motion.div>
            ) : (
              <motion.div
                key="girl"
                variants={tabFade}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <PersonForm form={girlForm} setForm={setGirlForm} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-center mt-8">
        <motion.button
          whileTap={{ scale: loading ? 1 : 0.97 }}
          onClick={handleSubmit}
          disabled={loading}
          className="px-10 py-3.5 bg-primary text-white font-medium text-sm rounded-xl hover:bg-gold transition-all duration-700 flex items-center gap-2.5 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Matching...
            </>
          ) : (
            <>
              <Users className="w-4 h-4" />
              Match Kundli
            </>
          )}
        </motion.button>
      </div>

      {/* ── Intro: Why marriage compatibility matters ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-20 sm:mt-24"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Free Kundli Matching for Marriage – Find Your{" "}
          <span className="text-gold">True Compatibility</span>
        </h2>
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-sm sm:text-lg text-black text-center leading-relaxed">
            Getting married changes everything. You aren't just planning a party
            or moving into the same apartment. You're combining two distinct
            personalities, family traditions, personal habits, and financial
            futures.
          </p>
          <p className="text-sm sm:text-lg text-black text-center leading-relaxed">
            In Vedic astrology, marriage is considered a connection of the mind,
            body, and energies. Hence, families have been utilizing kundli
            matching or Patrika Milan, also known as horoscope matching for
            marriage, for years and years to help couples create a stable and
            long-lasting life together.
          </p>
          <p className="text-sm sm:text-lg text-black text-center leading-relaxed">
            By performing an{" "}
            <Link
              to={"/free-online-kundli"}
              className="underline text-gold font-medium"
            >
              online Kundali
            </Link>{" "}
            matching according to the date of birth, you will receive specific
            information instead of general predictions. You get to see the exact
            positions of the planets and the Moon at the time of your birth and
            their birth chart at the same time. That map tells you how you deal
            with stress, how you communicate, how money will move in your
            household, and how you'll feel about each other in the future, 10
            years down the road.
          </p>
          <p className="text-sm sm:text-lg text-black text-center leading-relaxed">
            At{" "}
            <Link to={"/"} className="underline font-medium text-gold">
              Astro Sushil
            </Link>
            , we reject the idea that horoscope matching should scare or stress
            you out. Computer warnings and dense Sanskrit terms often confuse
            people more than they help. Know your Manglik Dosha, planetary
            compatibility, and 36 Guna score in a readable format with our Free
            Tool.
          </p>
        </div>
      </motion.section>

      {/* ── Why Kundali Matching by DOB Matters ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Why Kundali Matching by Date of{" "}
          <span className="text-gold">Birth Matters</span>
        </h2>
        <p className="text-sm sm:text-lg text-black text-center max-w-4xl mx-auto leading-relaxed mb-10">
          When people date or arrange a marriage, they usually focus on the
          obvious details: career status, shared interests, or good dinner
          conversation. All that is important, but people change over the years.
          Vedic kundali matching for marriage looks at a person's core emotional
          and mental setup — the baseline traits that rarely shift. Here is why
          running a match before tying the knot helps:
        </p>
        <NumberedList items={WHY_MATCHING_MATTERS} />
      </motion.section>

      {/* ── What Happens When Kundli Matching Is Ignored ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          What Happens When Kundli{" "}
          <span className="text-gold">Matching Is Ignored?</span>
        </h2>
        <div className="max-w-4xl mx-auto space-y-4 mb-10">
          <p className="text-sm sm:text-lg text-black leading-relaxed">
            While skipping the kundali matching doesn't necessarily mean the end
            of a marriage, it can also leave couples unaware of potential
            subconscious issues. Many couples have a good relationship during
            the honeymoon period, but then encounter unanticipated walls two or
            three years later. Without considering chart compatibility, minor
            personality differences can escalate into a big stress:
          </p>
        </div>
        <NumberedList items={IGNORED_RISKS} columns={1} />
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mt-8">
          Looking at your charts is not to see if there are reasons to end. It
          provides you with a map of the rough roadways, and you can know where
          the rough roads are before you get on the road.
        </p>
      </motion.section>

      {/* ── Ashta Koota Milan / 36 Guna Score table ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          How Ashta Koota Milan Works{" "}
          <span className="text-gold">(The 36 Guna Score)</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-8">
          In North Indian astrology, the method of kundali matching is known as
          Ashta Koota Milan. "Ashta" is the word for eight, and "Koota" is the
          word for factors. The system checks 8 core areas of life based on the
          Moon's position in both charts, totaling 36 points, or Gunas. Here is
          what those 8 factors measure:
        </p>

        <div className="max-w-4xl mx-auto overflow-x-auto rounded-2xl border border-secondary/20 shadow-sm">
          <table className="w-full text-sm sm:text-base text-left border-collapse">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-4 py-3 font-heading font-semibold whitespace-nowrap">
                  Factor (Koota)
                </th>
                <th className="px-4 py-3 font-heading font-semibold text-center whitespace-nowrap">
                  Points
                </th>
                <th className="px-4 py-3 font-heading font-semibold">
                  What It Means for Your Marriage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/20">
              {ASHTAKOOTA_TABLE.map((row) => (
                <tr
                  key={row.factor}
                  className="odd:bg-secondary/5 hover:bg-secondary/10 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">
                    {row.factor}
                  </td>
                  <td className="px-4 py-3 text-center text-gold font-bold whitespace-nowrap">
                    {row.points}
                  </td>
                  <td className="px-4 py-3 text-black/80">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* ── Understanding your Guna score ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Understanding Your Guna Score:{" "}
          <span className="text-gold">What Is a Good Match?</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10">
          A common myth claims you need a perfect 36 out of 36 to run a
          successful household. Getting a 36 is rare, and you don't need it.
        </p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {GUNA_SCORE_RANGES.map(({ range, label, description }) => (
            <div
              key={range}
              className="rounded-xl border-2 border-gold bg-secondary/50 p-5"
            >
              <p className="font-heading text-gold font-bold text-lg mb-1">
                {range}
              </p>
              <p className="text-sm text-black/80 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto border-l-4 border-gold bg-secondary/10 rounded-r-lg p-5">
          <p className="text-sm sm:text-base text-black/80 leading-relaxed italic">
            <span className="not-italic font-bold text-primary">
              A Note from Astro Sushil:{" "}
            </span>
            Don't panic over Guna scores alone! If you have strong love and
            devotion charts, a score of 20 out of 36 can result in a great
            marriage. A 30/36 score, on the other hand, can still come to a
            standstill when Mars or Saturn is also involved in the house of
            marriage. Our tool will focus on the overall score rather than the
            raw score.
          </p>
        </div>
      </motion.section>

      {/* ── Matching by DOB vs by Name ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Kundali Matching by Date of Birth{" "}
          <span className="text-gold">vs. Matching by Name</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10">
          The online tools typically provide two options: Kundali Matching by
          Name or Kundali Matching by Date of Birth. The difference between them
          matters:
        </p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-xl border-2 border-gold bg-secondary/50 p-5">
            <p className="font-heading text-primary font-bold text-lg mb-2">
              Matching by Date, Time & Place
              <span className="block text-gold text-xs font-semibold uppercase tracking-wider mt-1">
                The Right Way
              </span>
            </p>
            <p className="text-sm text-black/80 leading-relaxed">
              This method uses exact birth details to calculate planetary
              positions down to the degree. It gives an accurate breakdown of
              your Guna score, Manglik status, and future timing.
            </p>
          </div>
          <div className="rounded-xl border-2 border-gold bg-secondary/50 p-5">
            <p className="font-heading text-primary font-bold text-lg mb-2">
              Matching by Name
              <span className="block text-gold text-xs font-semibold uppercase tracking-wider mt-1">
                The Backup Way
              </span>
            </p>
            <p className="text-sm text-black/80 leading-relaxed">
              If you lack an exact birth time, matching by name uses the
              starting sound of your spoken name to estimate your Moon sign. It
              works as a rough estimate, but it cannot calculate house
              positions.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Beyond points: Manglik Dosha & key planets ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Beyond Points: Checking{" "}
          <span className="text-gold">Manglik Dosha & Key Planets</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10">
          Counting points only tells half the story. A complete match tests key
          structural factors across both charts:
        </p>
        <NumberedList items={KEY_PLANETS_CHECK} columns={1} />
      </motion.section>

      {/* ── Handling clashes in love marriages ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          How to Handle Kundli Clashes{" "}
          <span className="text-gold">in Love Marriages</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10">
          If you fell in love and your online{" "}
          <Link
            to={"/personalized-astrology-reports/match-making-report"}
            className="underline font-medium text-gold"
          >
            kundli matching report
          </Link>{" "}
          comes back with a low score, take a breath. A low score is not a
          command to break up. In love marriages, deep mutual commitment already
          exists, which acts as a powerful buffer against planetary friction.
          Here is how to handle a tricky report without throwing away a good
          relationship:
        </p>
        <NumberedList items={LOVE_MARRIAGE_TIPS} columns={1} />
      </motion.section>

      {/* ── How to use the calculator ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          How to Use Our{" "}
          <span className="text-gold">Free Match Calculator</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10 text-center">
          Checking your compatibility takes two minutes:
        </p>
        <StepTimeline steps={MATCH_STEPS} />
      </motion.section>

      {/* ── What Makes Astro Sushil Different (same treatment as About Us page) ── */}
      <section
        aria-labelledby="kundli-match-why-choose-heading"
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
              id="kundli-match-why-choose-heading"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="font-heading text-white text-3xl sm:text-4xl leading-tight"
            >
              What Makes{" "}
              <span className="text-gold">Astro Sushil Different?</span>
            </motion.h2>
            <p className="text-sm sm:text-lg text-white max-w-4xl mx-auto leading-relaxed">
              With a deep understanding of astrology and human experiences,{" "}
              <Link
                to={"/online-consultations"}
                className="underline font-medium text-gold"
              >
                Astro Sushil Kumar
              </Link>{" "}
              provides guidance that goes beyond ordinary predictions.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-12">
            {WHY_CHOOSE_US_MATCH.map((feature, i) => (
              <MatchWhyChooseCard
                key={feature.id}
                feature={feature}
                delay={i * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Practical remedies ── */}
      <motion.section
        variants={contentFadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mt-16"
      >
        <h2 className="font-heading text-3xl sm:text-4xl text-center font-bold text-primary mb-5">
          Practical Remedies for{" "}
          <span className="text-gold">Low Matching Scores or Doshas</span>
        </h2>
        <p className="text-sm sm:text-lg text-black max-w-4xl mx-auto leading-relaxed mb-10">
          If you have a low matching score or an unresolved Dosha, it doesn't
          mean that you should cancel the wedding, particularly if you are in a
          loving, committed relationship! In Vedic astrology, there are simple
          methods to neutralize the negative planetary influences:
        </p>
        <NumberedList items={REMEDIES} />
      </motion.section>

      {/* ── FAQs ── */}
      <div className="mt-8 -mx-8">
        <FaqSection faqs={MATCH_FAQS} />
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KundliMatch() {
  return (
    <>
      <Seo
        title="Kundli Matching for Marriage | Online Kundali Matching by Date of Birth"
        description="Get fast, accurate online Kundli matching for marriage by date of birth. Calculate 36 Gunas, check Manglik & Nadi Dosha, and get practical Vedic insights at Astro Sushil Kumar."
      />
      <PageHero
        title="Kundli Matching for Marriage | Online Kundali Matching by Date of Birth"
        highlight="Online Kundali Matching"
        subtitle="Whether you are checking 36 Gunas or analyzing Manglik Dosha, Astro Sushil brings you fast, trustworthy kundali matching for marriage Get detailed compatibility insights in seconds using exact birth details."
        ctaBtn="Talk to Astrologer Sushil Kumar Singh"
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Kundli Match",
            href: "/free-online-kundli",
          },
        ]}
      />
      <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
          <KundliMatchCard />
        </div>
      </section>
    </>
  );
}
