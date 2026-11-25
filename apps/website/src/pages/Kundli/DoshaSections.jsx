/* eslint-disable no-unused-vars */
// DoshaSection.jsx — Step 3: Mangal / Kaal Sarp / Pitra / Sadhesati Dosha tabs
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAstrologyStore } from "../../store/useAstrologyStore";

const DOSHA_TABS = [
  { id: "mangal", label: "Mangal Dosha" },
  { id: "kaal", label: "Kaal Sarp Dosha" },
  { id: "pitra", label: "Pitra Dosha" },
  { id: "sadhesati", label: "Sadhesati" },
];

function MangalTable({ data }) {
  if (!data) return <EmptyState />;
  return (
    <div className="p-5 space-y-3">
      <InfoRow
        label="Is Manglik"
        value={data.is_present ? "Yes" : "No"}
        highlight={data.is_present}
      />
      <InfoRow
        label="Manglik Percentage"
        value={data.percentage_manglik_present ?? "—"}
      />
      <InfoRow label="Manglik Status" value={data.manglik_status ?? "—"} />
      <InfoRow label="Manglik Reason" value={data.manglik_reason ?? "—"} />
      <InfoRow label="Report" value={data.manglik_report ?? "—"} />
      <InfoRow label="Consideration" value={data.consideration ?? "—"} />
    </div>
  );
}

function KaalTable({ data }) {
  if (!data) return <EmptyState />;
  return (
    <div className="p-5 space-y-3">
      <InfoRow
        label="Is Kaal Sarp"
        value={data.present ? "Yes" : "No"}
        highlight={data.present}
      />
      <InfoRow label="Type" value={data.type ?? "—"} />
      <InfoRow label="Name" value={data.name ?? "—"} />
      <InfoRow label="Report" value={data.one_line ?? "—"} />
      <InfoRow label="Direction" value={data.direction ?? "—"} />
    </div>
  );
}

function PitraTable({ data }) {
  if (!data) return <EmptyState />;

  const points = data.pitra_dosha_points ?? [];

  return (
    <div className="p-5 space-y-3">
      <InfoRow
        label="Is Pitra Dosha"
        value={data.is_pitri_dosha_present ? "Yes" : "No"}
        highlight={data.is_pitri_dosha_present}
      />
      <InfoRow label="Report" value={data.report ?? "—"} />
      <InfoRow label="Conclusion" value={data.conclusion ?? "—"} />

      {points.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">
            Dosha Points
          </p>
          <div className="space-y-1.5">
            {points.map((pt, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-black/60 bg-[#faf8ff] rounded-lg px-3 py-2 border border-[#ede8f8]"
              >
                <span className="w-4 h-4 rounded-full bg-[#eeedfe] text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {pt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SadhesatiTable({ data }) {
  if (!data) return <EmptyState />;

  const phases = data.sadhesati_phases ?? data.phases ?? [];

  return (
    <div className="p-5 space-y-3">
      <InfoRow
        label="Is Sadhesati"
        value={data.sadhesati_phase ? "Yes" : "No"}
        highlight={data.is_sadhesati}
      />
      <InfoRow label="Phase" value={data.sadhesati_phase ?? "—"} />
      <InfoRow label="Report" value={data.report ?? "—"} />
      <InfoRow
        label="Current Phase"
        value={data.is_undergoing_sadhesati ?? "—"}
      />
      <InfoRow label="Moon Sign" value={data.moon_sign ?? "—"} />
      <InfoRow label="Saturn Sign" value={data.saturn_sign ?? "—"} />

      {phases.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-2">
            Phases
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 380 }}>
              <thead>
                <tr className="bg-[#faf8ff] border-b border-[#ede8f8]">
                  {["Phase", "Start", "End", "Type"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 text-[10px] font-bold text-black/30 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phases.map((ph, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#f3f0fb] hover:bg-[#faf8ff] transition-colors ${i % 2 !== 0 ? "bg-[#fdf9ff]" : ""}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-black">
                      {ph.phase ?? ph.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-black/60">
                      {ph.start ?? ph.start_date ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-black/60">
                      {ph.end ?? ph.end_date ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-black/50">
                      {ph.type ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-stretch border-b border-[#f3f0fb] last:border-0 rounded-lg overflow-hidden">
      <span className="text-xs text-black/50 w-36 shrink-0 px-4 py-2.5 bg-[#F4EEFF]">
        {label}
      </span>
      <span
        className={`text-xs font-semibold px-4 py-2.5 flex-1 text-right ${
          highlight ? "text-red-500" : "text-black"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-xs text-black/30">No data available</p>
    </div>
  );
}

export default function DoshaSection({ data }) {
  const [activeTab, setActiveTab] = useState("mangal");
  const { kundli } = useAstrologyStore();

  const mangalData = data?.manglik ?? null;
  const kaalData = data?.kalsarpa_details ?? null;
  const pitraData = data?.pitra_dosha_report ?? null;
  const sadhesatiData = data?.sadhesati_current_status ?? null;

  const tabContent = {
    mangal: <MangalTable data={mangalData} />,
    kaal: <KaalTable data={kaalData} />,
    pitra: <PitraTable data={pitraData} />,
    sadhesati: <SadhesatiTable data={sadhesatiData} />,
  };

  const entryCounts = {
    mangal: mangalData ? 1 : 0,
    kaal: kaalData ? 1 : 0,
    pitra: pitraData ? 1 : 0,
    sadhesati: sadhesatiData ? 1 : 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex gap-2 flex-wrap mb-4">
        {DOSHA_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer
              ${
                activeTab === tab.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-black/50 border-[#d4cdf5] hover:border-primary/50 hover:text-primary"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#e0d9f5] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ede8f8]">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-full bg-primary inline-block" />
            <span className="text-sm font-bold text-black">
              {DOSHA_TABS.find((t) => t.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full inline-block ${entryCounts[activeTab] ? "bg-red-400" : "bg-green-400"}`}
            />
            <span className="text-[10px] text-black/30 font-medium">
              {entryCounts[activeTab] ? "Dosha Present" : "No Dosha"}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
