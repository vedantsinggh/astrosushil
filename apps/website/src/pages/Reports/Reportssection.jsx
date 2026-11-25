/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReportsCarousel from "./ReportsCarousel";
import Seo from "../../components/Seo";
import useReportStore from "@/store/useReportStore";
import { useCurrency } from "../../hooks/useCurrency";
import { useNavigate } from "react-router-dom";

const TABS = [
  { key: "all", label: "All" },
  { key: "popular", label: "Popular" },
  { key: "trending", label: "Trending" },
];

const ITEMS_PER_PAGE = 6;

function ReportCard({ report, index }) {
  const navigate = useNavigate();
  const { convert } = useCurrency();

  const handleViewMore = () => {
    navigate(`/personalized-astrology-reports/${report.slug}`);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="relative flex flex-col"
      style={{ minHeight: "420px" }}
    >
      <img
        src="/Image/card-frame.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 p-3 w-full h-full object-fill pointer-events-none z-10"
        draggable={false}
      />

      <div className="relative z-0 flex flex-col h-full bg-secondary rounded-2xl p-8 m-1.5">
        <div className="w-full aspect-4/3 rounded-sm overflow-hidden mb-4 flex items-center justify-center">
          <img
            src={report.coverImage}
            alt={report.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentNode.classList.add("placeholder-bg");
            }}
          />
        </div>

        <div className=" p-2">
          <h3 className="text-[22px] max-w-full font-bold mb-1 leading-snug text-primary line-clamp-1">
            {report.name}
          </h3>

          <p className="text-[14px] leading-relaxed mb-3 flex-1 line-clamp-2">
            {report.shortDescription}
          </p>

          <div className="flex flex-col gap-0.5 mb-3">
            <div className="flex items-center gap-2">
              {report.originalPrice && (
                <span className="text-base line-through font-body text-black/40">
                  {convert(report.originalPrice)}
                </span>
              )}
              <span className="text-lg font-bold text-primary">
                {convert(report.salePrice)}
              </span>
            </div>
            <span className="text-black/35 text-[10.5px] font-body">
              {report.gst?.type === "inclusive"
                ? "Inclusive of GST"
                : "Exclusive of GST"}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleViewMore}
            className="w-full py-2.5 bg-primary hover:bg-gold transition-colors duration-700 rounded-lg text-sm sm:text-sm font-medium text-white tracking-wide cursor-pointer"
          >
            View more
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="relative flex flex-col animate-pulse"
      style={{ minHeight: "420px" }}
    >
      <div className="flex flex-col h-full bg-secondary/30 rounded-2xl px-5 pt-5 pb-4 m-1.5 border border-gray-100">
        <div className="w-full aspect-4/3 bg-gray-200 rounded-sm mb-4" />
        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-100 rounded mb-1 w-full" />
        <div className="h-4 bg-gray-100 rounded mb-4 w-5/6" />
        <div className="flex gap-2 mb-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-full" />
      </div>
    </div>
  );
}

function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-2 justify-center mt-10 flex-wrap">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="px-3 py-1 text-[12px] rounded-sm disabled:opacity-40 cursor-pointer hover:opacity-80"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-primary)",
        }}
      >
        Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="w-8 h-8 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background:
              p === current ? "var(--gradient-primary)" : "transparent",
            color: p === current ? "#fff" : "var(--color-primary)",
            border: p === current ? "none" : "1px solid var(--color-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="px-3 py-1 text-[12px] rounded-sm disabled:opacity-40 cursor-pointer hover:opacity-80"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-primary)",
        }}
      >
        Next
      </button>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative font-heading flex items-center gap-6 pl-1 pr-5 py-2 rounded-xl cursor-pointer overflow-visible min-w-32 ${active ? "bg-gold text-white" : "bg-[url('/Image/card-bg.webp')] bg-cover bg-center bg-no-repeat hover:bg-gold text-white"}`}
    >
      <span className="relative z-10 -ml-3 shrink-0 w-8 h-8 rounded-full overflow-hidden">
        <img
          src="/Image/tab-ellipse.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </span>
      <span
        className="relative z-10 text-sm sm:text-base font-medium tracking-wide"
        // style={{ color: active ? "var(--color-primary)" : "var(--color-gold)" }}
      >
        {label}
      </span>
    </motion.button>
  );
}

export default function ReportsSection() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  const { reports, loading, error, getReports } = useReportStore();

  useEffect(() => {
    getReports();
  }, []);

  const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);
  const paginated = reports.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  return (
    <>
      <Seo page="reports" />
      <ReportsCarousel />
      <section className="py-16 px-5 max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p
            className="text-[13px] uppercase tracking-[0.2em] mb-2 text-primary"
            style={{ fontFamily: "var(--font-body)" }}
          >
            About The Reports
          </p>
          <h2 className="text-[28px] md:text-[36px] leading-tight text-primary ">
            Highly Preferred by
            <span className=" text-gold ml-2">Our Users</span>
          </h2>
          <p className="mt-3 max-w-4xl mx-auto text-base text-primary leading-relaxed">
            Astro Sushil Sir is known for his profound wisdom, clear guidance,
            and deeply intuitive understanding of Vedic astrology. With a calm
            presence and an extraordinary ability to simplify even the most
            complex cosmic patterns, he helps people find clarity, direction,
            and confidence in their life journey.
          </p>
        </div>

        <div className="flex items-center gap-5 mb-8 flex-wrap justify-center md:justify-start">
          {TABS.map((t) => (
            <TabBtn
              key={t.key}
              label={t.label}
              active={activeTab === t.key}
              onClick={() => handleTabChange(t.key)}
            />
          ))}
        </div>

        {error && !loading && (
          <div className="text-center py-12 text-red-500 text-[13px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + page}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {paginated.length > 0 ? (
                paginated.map((report, i) => (
                  <ReportCard key={report._id} report={report} index={i} />
                ))
              ) : (
                <p className="col-span-3 text-center text-[13px] text-gray-400 py-12">
                  No reports found.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <Pagination current={page} total={totalPages} onChange={setPage} />
        )}
      </section>
    </>
  );
}
