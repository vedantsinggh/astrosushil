/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Video,
  MessageSquare,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Shield,
  HelpCircle,
  MapPin,
  Loader2,
} from "lucide-react";
import PageHero from "../../components/HeroPage";
import { useConsultationStore } from "../../store/useConsultationStore";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import BookingModal from "./BookingModal";
import toast from "react-hot-toast";
import Seo from "../../components/Seo";
import { useCurrency } from "../../hooks/useCurrency";
const TABS = [
  { id: "normal", label: "Normal" },
  { id: "special", label: "Special" },
];

const MODE_ICONS = {
  audio: <Phone size={13} />,
  video: <Video size={13} />,
  in_person: <MapPin size={13} />,
};

const MODE_LABELS = {
  audio: "Voice Call",
  video: "Video Call",
  in_person: "In-Person",
};

function ModePill({ modeObj, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-body font-medium transition-all duration-700 cursor-pointer
        ${
          selected
            ? "bg-gold text-white"
            : "bg-primary text-white hover:bg-gold"
        }`}
    >
      {MODE_ICONS[modeObj.mode]}
      {MODE_LABELS[modeObj.mode] || modeObj.mode}
    </button>
  );
}

function ConsultationCard({ plan, onBook }) {
  const { convert } = useCurrency();
  const [selectedModeIdx, setSelectedModeIdx] = useState(0);

  const modes = plan.modes || [];
  const activeMode = modes[selectedModeIdx] ?? modes[0];
  const price =
    activeMode?.priceWithGst ?? activeMode?.price?.inr ?? activeMode?.price ?? 0;
  const formattedPrice = price > 0 ? convert(price) : "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-black/8 shadow-sm hover:shadow-md hover:border-primary/15 transition-all duration-300 overflow-hidden"
    >
      {/* ── Top bar: mode pills + duration ── */}
      <div className="px-5 pt-5 pb-4 border-b border-black/6 flex flex-wrap items-center gap-2">
        {/* Clickable mode pills */}
        {modes.map((m, i) => (
          <ModePill
            key={m._id}
            modeObj={m}
            selected={selectedModeIdx === i}
            onClick={() => setSelectedModeIdx(i)}
          />
        ))}

        {/* Duration — not shown for in-person mode, which has no fixed call time limit */}
        {activeMode?.mode !== "in_person" && (
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-body font-semibold bg-secondary/60 text-primary border-primary/30">
            <Clock size={11} />
            Time Limit – {plan.duration} Min.
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: title, description, includes, note */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            {/* <Link to={plan._id}> */}
            <h3 className="font-heading font-bold text-primary text-base sm:text-2xl leading-snug hover:underline underline-offset-2">
              {plan.title}
            </h3>
            {/* </Link> */}
            {/* {plan.responseDays > 0 && (
              <p className="text-sm text-black/80 font-body mt-0.5">
                Appointment within {plan.responseDays} days
              </p>
            )} */}
          </div>

          {plan.description &&
            plan.description.split(".").map((p, i) => (
              <p
                key={i}
                className="text-sm text-black/70 font-body leading-relaxed"
              >
                {p}
              </p>
            ))}

          {plan.includes?.length > 0 && (
            <div className="bg-secondary border border-primary/8 border-l-4 border-l-primary rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm font-body font-bold text-primary uppercase tracking-widest mb-2">
                Includes Section
              </p>
              {plan.includes.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Sparkles size={14} className="shrink-0 text-primary" />
                  <p className="text-sm font-body text-black/80 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          )}

          {plan.note && (
            <p className="text-sm font-body text-black/85 leading-relaxed">
              <span className="font-semibold text-black/85">Note: </span>
              {plan.note}
            </p>
          )}
        </div>

        <div className="flex md:flex-col items-center sm:items-end justify-between gap-3 sm:gap-4 sm:min-w-44 md:self-stretch shrink-0">
          <div className="text-right">
            <AnimatePresence mode="wait">
              <motion.p
                key={formattedPrice}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="font-body font-bold text-primary text-2xl sm:text-3xl leading-none"
              >
                {formattedPrice}
              </motion.p>
            </AnimatePresence>
            {price > 0 && (
              <p className="text-black/35 text-[11px] font-body mt-1">
                Inclusive of all taxes
              </p>
            )}
          </div>

          {plan.modes.some((m) => m.mode === "in_person") ? (
            <Link
              to="/contact-us"
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white font-body font-medium text-sm whitespace-nowrap cursor-pointer hover:bg-gold transition-all duration-700"
            >
              Contact Now <ChevronRight size={15} />
            </Link>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onBook({ ...plan, selectedMode: activeMode })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white font-body font-medium text-sm whitespace-nowrap cursor-pointer hover:bg-gold transition-all duration-700"
            >
              Book Now <ChevronRight size={15} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ConsultationSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab =
    searchParams.get("type") === "special" ? "special" : "normal";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { consultations, consultationsLoading, getConsultations } =
    useConsultationStore();
  const { token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    getConsultations();
  }, []);

  useEffect(() => {
    const type = searchParams.get("type");
    setActiveTab(type === "special" ? "special" : "normal");
  }, [searchParams]);

  const plans = consultations.filter((c) => c.type === activeTab && c.isActive);

  const handleBook = (plan) => {
    if (!token) {
      toast.error("Please login to book a consultation");
      navigate("/dashboard/");
      return;
    }
    setSelectedPlan(plan);
  };

  const handleConfirm = () => {
    setSelectedPlan(null);
    toast.success("Booking confirmed! 🎉");
    navigate("/online-consultations/booking-successful");
  };

  return (
    <>
      <Seo page="online-consultations" />
      <PageHero
        title="Book an Astrology Consultation"
        highlight="Consultation"
        subtitle="Choose the consultation that suits your needs. Receive personal guidance on career, marriage, health, finance, education, and other life matters through detailed Kundli analysis."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Consultation", href: "/online-consultations/" },
        ]}
      />

      <section
        aria-labelledby="consultation-heading"
        className="w-full bg-white py-12 sm:py-16 lg:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* ── Tabs ── */}
          <div
            className="flex gap-3 flex-wrap"
            role="tablist"
            aria-label="Consultation types"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set("type", tab.id);
                  setSearchParams(nextParams, { replace: true });
                  setActiveTab(tab.id);
                }}
                type="button"
                className={`relative cursor-pointer flex items-center gap-2 px-8 sm:px-10 lg:px-20 py-2.5 rounded-xl font-heading font-semibold text-sm sm:text-lg transition-all duration-700
                focus-visible:outline-none
                  ${
                    activeTab === tab.id && tab.id === "normal"
                      ? "bg-gold text-white"
                      : activeTab === tab.id && tab.id === "special"
                        ? "text-white bg-gold"
                        : "bg-[url('/Image/card-bg.webp')] bg-cover bg-center bg-no-repeat hover:bg-gold text-white"
                  }`}
              >
                <img
                  src="/Image/mission-icon.png"
                  alt=""
                  aria-hidden="true"
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                  className="absolute top-2 left-2 -translate-x-1/2 w-8 h-8 object-contain z-5"
                />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-md ring-2 ring-inset ring-white/20"
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          {consultationsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary/50" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-center text-sm text-black/40 py-16">
              No consultations available.
            </p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {plans.map((plan) => (
                  <ConsultationCard
                    key={plan._id}
                    plan={plan}
                    onBook={handleBook}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedPlan && (
          <BookingModal
            consultation={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onConfirm={handleConfirm}
          />
        )}
      </AnimatePresence>
    </>
  );
}
