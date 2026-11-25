/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Shield,
  CheckCircle2,
  Sparkles,
  Calendar,
  Award,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { useConsultationStore } from "../../store/useConsultationStore";
import BookingModal from "./BookingModal";
import SuccessModal from "./SuccessModal";
import { MODE_ICONS, MODE_LABELS, fmt } from "./Consultationconstants";
import { useCurrency } from "../../hooks/useCurrency";
import PageHero from "@/components/HeroPage";
export default function ConsultationDetailPage() {
  const { convert } = useCurrency();
  const { id } = useParams();
  const { consultation, loading, getConsultationById } = useConsultationStore();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);
  const [selectedModeIdx, setSelectedModeIdx] = useState(0); // ← new

  useEffect(() => {
    if (id) getConsultationById(id);
  }, [id]);

  useEffect(() => {
    setSelectedModeIdx(0);
  }, [consultation?._id]);

  useEffect(() => {
    document.body.style.overflow =
      bookingOpen || !!successBooking ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bookingOpen, successBooking]);

  const handleConfirm = useCallback((booking) => {
    setBookingOpen(false);
    setSuccessBooking(booking);
  }, []);

  const modes = consultation?.modes || [];
  const activeMode = modes[selectedModeIdx] ?? modes[0];
  const activePrice = activeMode?.priceWithGst ?? activeMode?.price?.inr ?? 0;

  const formattedPrice = activePrice > 0 ? convert(activePrice) : "—";

  const consultationWithMode = consultation
    ? { ...consultation, selectedMode: activeMode }
    : null;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary/40" />
      </div>
    );

  if (!consultation)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-black/40 font-body text-sm">
          Consultation not found.
        </p>
      </div>
    );

  return (
    <>
      <PageHero
        title={consultation.title}
        highlight={consultation.title.split(" ")[0] || ""}
        subtitle={consultation.description}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Consultation", href: "/online-consultations/" },
          { label: consultation.title, href: `/online-consultations/${id}` },
        ]}
      />

      <main className="min-h-screen bg-[url('/Image/bg.webp')] bg-cover bg-bottom">
        <div className="py-10 sm:py-14 text-black">
          <div className="max-w-7xl mx-auto px-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex-1 min-w-0">
                {consultation.type === "special" && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-body font-semibold border border-gold/30">
                      Special Plan
                    </span>
                  </div>
                )}
                <h1 className="font-heading font-bold text-primary text-2xl sm:text-3xl leading-tight">
                  {consultation.title}
                </h1>
                {consultation.description && (
                  <p className="text-black/80 font-body text-sm mt-1">
                    {consultation.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-black/80 text-xs font-body">
                    <Clock size={12} /> {consultation.duration} Min
                  </span>
                  {consultation.responseDays > 0 && (
                    <>
                      <span className="text-black/30 text-xs">·</span>
                      <span className="text-black/80 text-xs font-body">
                        Appointment within {consultation.responseDays} days
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="space-y-8 min-w-0">
              {consultation.includes?.length > 0 && (
                <section>
                  <h2 className="font-heading font-bold text-primary text-lg mb-3">
                    What's Included
                  </h2>
                  <div className="bg-secondary/20 backdrop-blur border border-l-4 border-l-primary border-primary/8 rounded-2xl p-5 space-y-2">
                    {consultation.includes.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Sparkles
                          size={15}
                          className="text-primary shrink-0 mt-0.5"
                        />
                        <p className="text-sm font-body text-black/80 leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {consultation.note && (
                <section>
                  <h2 className="font-heading font-bold text-primary text-lg mb-3">
                    Important Note
                  </h2>
                  <div className="border-l-4 border-primary/30 pl-4">
                    <p className="text-sm font-body text-black/85 leading-relaxed">
                      {consultation.note}
                    </p>
                  </div>
                </section>
              )}
            </div>

            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-black/8 shadow-md overflow-hidden">
                <div className="bg-primary px-5 py-4">
                  <p className="text-white/80 font-body text-xs mb-1">
                    {consultation.duration} Min
                    {activeMode &&
                      ` · ${MODE_LABELS[activeMode.mode] ?? activeMode.mode}`}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activePrice}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-baseline gap-2"
                    >
                      <span className="font-heading font-bold text-white text-3xl">
                        {formattedPrice}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                  {activePrice > 0 && (
                    <p className="text-white/50 text-[11px] font-body mt-1">
                      Inclusive of all taxes
                    </p>
                  )}
                  {consultation.priceLabel && (
                    <p className="text-white/50 text-xs font-body mt-1">
                      {consultation.priceLabel}
                    </p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {modes.length > 1 && (
                    <div>
                      <p className="text-[10px] font-body font-semibold text-black/40 uppercase tracking-wider mb-2">
                        Choose Mode
                      </p>
                      <div className="flex flex-col gap-2">
                        {modes.map((m, i) => {
                          const selected = selectedModeIdx === i;
                          return (
                            <button
                              key={m._id ?? i}
                              type="button"
                              onClick={() => setSelectedModeIdx(i)}
                              className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-body font-medium transition-all duration-150 cursor-pointer
                                ${
                                  selected
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-black/10 text-black/50 hover:border-primary/30 hover:text-primary"
                                }`}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                  ${selected ? "border-primary bg-primary" : "border-black/20"}`}
                                >
                                  {selected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                                  )}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  {MODE_ICONS[m.mode]}
                                  {MODE_LABELS[m.mode] ?? m.mode}
                                </span>
                              </span>
                              <span
                                className={`font-semibold text-sm ${selected ? "text-primary" : "text-black/60"}`}
                              >
                                {m.priceWithGst ?? m.price?.inr
                                  ? convert(m.priceWithGst ?? m.price.inr)
                                  : "—"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 bg-secondary/20 rounded-xl p-3">
                    {[
                      {
                        icon: <Clock size={12} />,
                        label: `${consultation.duration} min session`,
                      },
                      {
                        icon: <HelpCircle size={12} />,
                        label: activeMode
                          ? (MODE_LABELS[activeMode.mode] ?? activeMode.mode)
                          : "—",
                      },
                      { icon: <Shield size={12} />, label: "Secure payment" },
                    ].map(({ icon, label }, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs font-body text-black/50"
                      >
                        <span className="text-primary">{icon}</span> {label}
                      </div>
                    ))}
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => setBookingOpen(true)}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white hover:bg-gold font-heading font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-colors duration-700 cursor-pointer"
                  >
                    <Calendar size={16} /> Book Now
                  </motion.button>

                  <p className="text-center text-[11px] font-body text-black/30 flex items-center justify-center gap-1">
                    <Shield size={11} className="text-green-500" />
                    Full refund if cancelled 24hrs before
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: <Award size={14} />, label: "Verified" },
                  { icon: <Shield size={14} />, label: "Secure" },
                  { icon: <CheckCircle2 size={14} />, label: "Trusted" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary/20 border border-primary/6"
                  >
                    <span className="text-primary/50">{icon}</span>
                    <span className="text-[10px] font-body text-black/40 font-medium">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {bookingOpen && (
          <BookingModal
            consultation={consultationWithMode}
            onClose={() => setBookingOpen(false)}
            onConfirm={handleConfirm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successBooking && (
          <SuccessModal
            booking={successBooking}
            onClose={() => setSuccessBooking(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
