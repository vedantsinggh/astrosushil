/* eslint-disable no-unused-vars */
// KundliReport.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BasicDetails from "./BasicDetail";
import BirthChart from "./BirthCharts";
import DoshaSection from "./DoshaSections";
import { useAstrologyStore } from "../../store/useAstrologyStore";
import { useNavigate } from "react-router-dom";
import { Telescope } from "lucide-react";
const TABS = ["Basic Details", "Birth Chart", "Dosha"];

function Tabs({ step, setStep }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {TABS.map((label, i) => (
        <button
          key={label}
          onClick={() => setStep(i)}
          className={`px-12 py-2.5 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200
            ${
              step === i
                ? "bg-gold text-white shadow-md"
                : "bg-secondary text-primary hover:bg-[#d4cdf5]"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function KundliReport() {
  const { kundli, formData } = useAstrologyStore();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  if (!kundli) {
    return (
      <div className="min-h-screen bg-[#f5f3ff] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          {/* Decorative */}
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✦</span>
          </div>
          <h3 className="font-heading text-2xl font-bold text-black mb-2">
            No Kundli Found
          </h3>
          <p className="text-sm text-black/45 mb-6 leading-relaxed">
            It seems like your kundli data has expired or hasn't been generated
            yet. Please fill in your birth details to generate your personalised
            Kundli.
          </p>
          <button
            onClick={() => navigate("/free-online-kundli")}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
          >
            Generate Kundli
          </button>
        </motion.div>
      </div>
    );
  }

  const mergedData = {
    user: {
      name: formData?.name || "—",
      dob: formData?.dob || "—",
      birthTime: formData?.hour + ":" + formData?.min || "—",
      birthPlace: formData?.place || "—",
      latitude: formData?.latitude || "—",
      longitude: formData?.longitude || "—",
    },
    astro_details: kundli.astro_details,
    basic_panchang: kundli.basic_panchang,
    planets: kundli.planets,
    manglik: kundli.manglik,
    kalsarpa_details: kundli.kalsarpa_details,
    pitra_dosha_report: kundli.pitra_dosha_report,
    sadhesati_current_status: kundli.sadhesati_current_status,
    vimshottri_antar_vdasha: kundli.vimshottri_antar_vdasha,
  };

  const sections = [
    <BasicDetails key="basic" data={mergedData} />,
    <BirthChart key="chart" planets={kundli.planets} />,
    <DoshaSection key="dosha" data={mergedData} />,
  ];

  return (
    <div className="min-h-screen bg-[#f5f3ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Tabs step={step} setStep={setStep} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {sections[step]}
          </motion.div>
        </AnimatePresence>

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-12">
          {/* <button
            onClick={() => setStep(0)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#d4cdf5] bg-primary text-white text-sm font-semibold  cursor-pointer transition-colors"
          >
            See Paid Reports
          </button> */}
        </div>
      </div>
    </div>
  );
}
