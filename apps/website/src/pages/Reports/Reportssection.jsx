/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, ArrowRight, Mail } from "lucide-react";
import ReportsCarousel from "./ReportsCarousel";
import Seo from "../../components/Seo";
import useReportStore from "@/store/useReportStore";
import { useCurrency } from "../../hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import {
  REPORT_CATALOG_CATEGORIES,
  SHARED_REPORT_ASSETS,
  getReportMeta,
  isReportPurchasable,
} from "../../data/reportCatalogMeta";

const ITEMS_PER_PAGE = 13;

function ReportCard({ report, index }) {
  const navigate = useNavigate();
  const { convert } = useCurrency();
  const meta = getReportMeta(report);
  const purchasable = isReportPurchasable(report);

  const coverSrc = report.coverImage || meta.coverImage;
  const illustrationSrc = report.illustrationUrl || meta.illustrationUrl;
  const displayPrice = report.priceBreakdown?.total ?? report.priceWithGst ?? report.salePrice;

  const handleViewMore = () => {
    navigate(`/personalized-astrology-reports/${report.slug}`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.04 }}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300"
      style={{
        border: `1px solid ${meta.borderTint}`,
      }}
    >
      {/* Top jewel-tone showcase header */}
      <div
        className="relative px-5 pt-5 pb-4 overflow-hidden"
        style={{ background: meta.jewelSurface }}
      >
        {/* Subtle SVG spot-art watermark in top-right */}
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden="true"
          className="absolute -right-5 -bottom-5 w-36 h-28 object-contain opacity-25 pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top status & category row */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide px-2.5 py-1 rounded-full backdrop-blur-sm"
            style={{
              backgroundColor: `${meta.accent}22`,
              color: meta.accent,
              border: `1px solid ${meta.accent}50`,
            }}
          >
            <img
              src={SHARED_REPORT_ASSETS.insightStar}
              alt=""
              aria-hidden="true"
              className="w-3 h-3"
            />
            {meta.badgeLabel}
          </span>

          {!purchasable && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-300/35">
              <Clock className="w-3 h-3" />
              Coming Soon
            </span>
          )}
        </div>

        {/* Portrait A4 WebP Preview + SVG Spot Art Emblem */}
        <div
          onClick={handleViewMore}
          className="relative z-10 flex items-end justify-center gap-3 cursor-pointer"
        >
          <div
            className="relative w-36 sm:w-40 aspect-210/297 rounded-xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:-translate-y-1"
            style={{
              border: `1.5px solid ${meta.accent}66`,
              boxShadow: `0 18px 34px -10px rgba(0,0,0,0.65), 0 0 24px -8px ${meta.accent}55`,
            }}
          >
            <img
              src={coverSrc}
              alt={report.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                if (e.currentTarget.src !== meta.coverImage) {
                  e.currentTarget.src = meta.coverImage;
                }
              }}
            />
            <span
              className="pointer-events-none absolute inset-x-2 top-2 text-center text-[7.5px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: meta.accent }}
            >
              Astro Sushil
            </span>
            <span className="pointer-events-none absolute inset-x-2 bottom-2 text-center font-heading text-[10px] font-semibold leading-tight text-[#fff8e7] line-clamp-2 drop-shadow">
              {report.name}
            </span>
          </div>

          <div
            className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-2xl p-2 shrink-0 mb-1 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: `1px solid ${meta.accent}45`,
            }}
          >
            <img
              src={illustrationSrc}
              alt={`${report.name} emblem`}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Bottom Jewel Accent Bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${meta.accent}, #d4af37)`,
        }}
      />

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[20px] font-bold leading-snug text-primary line-clamp-2">
            {report.name}
          </h3>
        </div>

        <p className="text-[13.5px] leading-relaxed text-[#4b4b63] mb-4 flex-1 line-clamp-3">
          {report.shortDescription || report.description}
        </p>

        {/* Languages & Format strip */}
        {Array.isArray(report.languages) && report.languages.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-black/45 font-medium">
              Editions:
            </span>
            {report.languages.map((lang) => (
              <span
                key={lang}
                className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                style={{
                  backgroundColor: meta.softTint,
                  color: "#2b2848",
                  border: `1px solid ${meta.borderTint}`,
                }}
              >
                {lang === "hi" ? "Hindi" : lang === "en" ? "English" : lang.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Pricing / Coming Soon row */}
        <div className="pt-3 border-t border-secondary/90 flex items-end justify-between gap-3 mb-4">
          {purchasable ? (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary font-heading">
                  {convert(displayPrice)}
                </span>
                {report.originalPrice && (
                  <span className="text-sm line-through font-body text-black/40">
                    {convert(report.originalPrice)}
                  </span>
                )}
              </div>
              <span className="text-black/45 text-[11px] font-body">
                {report.priceBreakdown?.taxAmount > 0
                  ? `Incl. ${report.priceBreakdown.rate}% GST (${convert(report.priceBreakdown.base)} + ${convert(report.priceBreakdown.taxAmount)})`
                  : "Inclusive of all taxes"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Pricing Pending
              </span>
              <span className="text-black/45 text-[11px] font-body">
                Releasing soon · Preview sections inside
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {purchasable ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleViewMore}
            className="w-full py-2.5 px-4 bg-primary hover:bg-gold transition-colors duration-300 rounded-xl text-sm font-medium text-white tracking-wide cursor-pointer inline-flex items-center justify-center gap-2"
          >
            View &amp; Order
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleViewMore}
              className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium text-primary border border-primary/25 hover:border-primary/60 hover:bg-secondary/40 transition-colors cursor-pointer"
            >
              Preview Report
            </motion.button>
            <button
              type="button"
              onClick={() => navigate("/contact-us/")}
              className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300/60 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              title="Pricing Pending — Enquire for release updates"
            >
              <Mail className="w-3.5 h-3.5" />
              Enquire
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-secondary bg-white animate-pulse">
      <div className="h-64 bg-primary/15 p-5 flex items-center justify-center">
        <div className="w-36 aspect-210/297 bg-white/30 rounded-xl" />
      </div>
      <div className="p-6 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-10 bg-gray-200 rounded-xl w-full mt-4" />
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

function TabBtn({ label, count, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`font-heading inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm sm:text-base font-medium tracking-wide transition-all duration-300 ${
        active
          ? "bg-primary text-white shadow-md"
          : "bg-secondary/70 text-primary hover:bg-secondary border border-primary/10"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-body ${
          active ? "bg-gold text-[#111] font-semibold" : "bg-white text-primary/80"
        }`}
      >
        {count}
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

  const categoryCounts = useMemo(() => {
    const counts = { all: reports.length, available: 0 };
    for (const cat of REPORT_CATALOG_CATEGORIES) {
      if (cat.key !== "all" && cat.key !== "available") counts[cat.key] = 0;
    }
    for (const r of reports) {
      if (isReportPurchasable(r)) counts.available += 1;
      const meta = getReportMeta(r);
      if (meta?.category && counts[meta.category] !== undefined) {
        counts[meta.category] += 1;
      }
    }
    return counts;
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (activeTab === "all") return reports;
    if (activeTab === "available") return reports.filter(isReportPurchasable);
    return reports.filter((r) => getReportMeta(r)?.category === activeTab);
  }, [reports, activeTab]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginated = filteredReports.slice(
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
      <section className="py-14 px-5 max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p
            className="text-[13px] uppercase tracking-[0.2em] mb-2 text-primary"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Canonical Report Collection
          </p>
          <h2 className="text-[28px] md:text-[38px] leading-tight text-primary">
            Personalised Vedic &amp;
            <span className="text-gold ml-2">Numerology Reports</span>
          </h2>
          <img
            src={SHARED_REPORT_ASSETS.sectionDivider}
            alt=""
            aria-hidden="true"
            className="w-72 sm:w-96 mx-auto my-3 opacity-80"
          />
          <p className="mt-2 max-w-3xl mx-auto text-base text-[#444460] leading-relaxed">
            Every report is computed deterministically from your exact birth
            date, time, and coordinates using classical Parashari, Tajika,
            Ashtakavarga, and Vedic Numerology frameworks—reviewed for clarity
            and delivered in English or Hindi.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2.5 mb-8 flex-wrap justify-center">
          {REPORT_CATALOG_CATEGORIES.map((t) => (
            <TabBtn
              key={t.key}
              label={t.label}
              count={categoryCounts[t.key] ?? 0}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {Array.from({ length: 6 }).map((_, i) => (
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7"
            >
              {paginated.length > 0 ? (
                paginated.map((report, i) => (
                  <ReportCard key={report._id} report={report} index={i} />
                ))
              ) : (
                <p className="col-span-full text-center text-[14px] text-gray-400 py-12">
                  No reports found in this category.
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
