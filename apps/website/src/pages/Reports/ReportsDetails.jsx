/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Clock, Languages, ShieldCheck, Sparkles, Mail } from "lucide-react";
import FaqSection from "../Faqs/Faqsection";
import Seo from "../../components/Seo";
import useReportStore from "@/store/useReportStore";
import { useCurrency } from "../../hooks/useCurrency";
import TestimonialsSection from "../Home/Testimonialssection";
import AboutAstrologer from "../Home/Aboutastrologer";
import { Breadcrumb } from "../../components/HeroPage";
import Include from "./Include";
import { useAuthStore } from "@/store/useAuthStore";
import LoginRequiredModal from "@/utils/LoginRequiredModal";
import {
  SHARED_REPORT_ASSETS,
  getReportMeta,
  isReportPurchasable,
} from "../../data/reportCatalogMeta";

export default function ReportsDetails() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { report, loading, error, getReportBySlug } = useReportStore();
  const { convert } = useCurrency();
  const { user } = useAuthStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (slug) getReportBySlug(slug);
  }, [slug]);

  const handleOrderNow = () => {
    if (!isReportPurchasable(report)) return;
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    navigate(`/report-order/${report.slug || slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl md:text-3xl text-primary font-heading mb-2">
          Report Not Found
        </h1>
        <p className="text-sm text-[#555570] mb-6 max-w-md">
          {error || "We could not find the report you are looking for."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/personalized-astrology-reports")}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-gold transition-colors cursor-pointer"
        >
          Browse All 13 Reports
        </button>
      </div>
    );
  }

  const meta = getReportMeta(report);
  const purchasable = isReportPurchasable(report);
  const coverSrc = report.coverImage || meta.coverImage;
  const illustrationSrc = report.illustrationUrl || meta.illustrationUrl;
  const displayTotal =
    report.priceBreakdown?.total ?? report.priceWithGst ?? report.salePrice;

  const summaryText =
    meta?.headerSummary || report.description || report.shortDescription;
  const summaryParagraphs = summaryText
    ? summaryText.split(". ").filter(Boolean)
    : [];

  const keyBenefits =
    report.benefits?.length > 0 ? report.benefits : meta.highlights || [];
  const featureTimeline =
    report.features?.length > 0 ? report.features : meta.highlights || [];

  return (
    <>
      <Seo
        title={`${report.name} | Astro Sushil`}
        description={meta.seoDescription || report.description || report.shortDescription}
        keywords={meta.seoKeywords}
        image={coverSrc}
      />

      {/* Jewel-Tone Hero Showcase */}
      <section
        className="relative overflow-hidden select-none"
        style={{ background: meta.jewelSurface }}
      >
        {/* Ambient SVG watermark */}
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-105 h-80 object-contain opacity-15 pointer-events-none"
        />

        <div className="relative z-10 max-w-7xl mx-auto pt-10 pb-4 px-5 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Copy */}
          <div className="lg:col-span-7 text-white">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full"
                style={{
                  backgroundColor: `${meta.accent}24`,
                  color: meta.accent,
                  border: `1px solid ${meta.accent}55`,
                }}
              >
                <img
                  src={SHARED_REPORT_ASSETS.insightStar}
                  alt=""
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                />
                {meta.badgeLabel}
              </span>

              {purchasable ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-300/35">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Available Now · 48h Delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-300/40">
                  <Clock className="w-3.5 h-3.5" />
                  Coming Soon · Pricing Pending
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              {report.name}
            </h1>

            <div className="text-base md:text-lg text-white/85 space-y-2.5 max-w-2xl mb-6 leading-relaxed">
              {summaryParagraphs.map((line, index) => (
                <p key={index}>
                  {line.trim() + (line.trim().endsWith(".") ? "" : ".")}
                </p>
              ))}
            </div>

            {/* Quick metadata pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mb-6">
              {Array.isArray(report.languages) && report.languages.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/15">
                  <Languages className="w-3.5 h-3.5 text-gold" />
                  Editions:{" "}
                  {report.languages
                    .map((l) => (l === "hi" ? "Hindi" : l === "en" ? "English" : l.toUpperCase()))
                    .join(" & ")}
                </span>
              )}
              {report.requires === "matchMakingDetails" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  Includes Bride &amp; Groom Chart Synthesis
                </span>
              )}
            </div>

            {/* Hero CTA / Price */}
            <div className="flex flex-wrap items-center gap-5 pb-4">
              {purchasable ? (
                <>
                  <button
                    type="button"
                    onClick={handleOrderNow}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gold hover:bg-[#e5c158] text-[#111] font-semibold text-sm tracking-wide transition-colors cursor-pointer shadow-lg"
                  >
                    Order Your Report
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl font-bold text-white font-heading">
                        {convert(displayTotal)}
                      </span>
                      {report.originalPrice && (
                        <span className="text-sm line-through text-white/45">
                          {convert(report.originalPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/65">
                      {report.priceBreakdown?.taxAmount > 0
                        ? `Incl. ${report.priceBreakdown.rate}% GST (${convert(report.priceBreakdown.base)} + ${convert(report.priceBreakdown.taxAmount)})`
                        : "Inclusive of all taxes"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white/60 border border-white/20 text-sm font-medium cursor-not-allowed"
                  >
                    <Clock className="w-4 h-4" />
                    Pricing Pending — Unavailable
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/contact-us/")}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-300/20 hover:bg-amber-300/30 text-amber-100 border border-amber-300/45 text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    Request Release Update
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Portrait Cover Showcase */}
          <div className="lg:col-span-5 flex items-center justify-center relative py-2">
            <div className="relative flex items-end gap-4">
              <div
                className="relative w-56 sm:w-64 aspect-210/297 rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  border: `2px solid ${meta.accent}75`,
                  boxShadow: `0 25px 50px -12px rgba(0,0,0,0.75), 0 0 40px -10px ${meta.accent}60`,
                }}
              >
                <img
                  src={coverSrc}
                  alt={report.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== meta.coverImage) {
                      e.currentTarget.src = meta.coverImage;
                    }
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-x-4 top-4 text-center text-[9.5px] uppercase tracking-[0.24em] font-semibold"
                  style={{ color: meta.accent }}
                >
                  Astro Sushil
                </span>
                <span className="pointer-events-none absolute inset-x-4 bottom-4 text-center font-heading text-sm font-semibold leading-snug text-[#fff8e7] line-clamp-2 drop-shadow">
                  {report.name}
                </span>
              </div>

              {/* Spot Art Badge */}
              <div
                className="hidden sm:flex flex-col items-center justify-center w-24 h-24 rounded-2xl p-3 backdrop-blur-md shadow-xl -ml-10 mb-4"
                style={{
                  background: "rgba(16, 13, 66, 0.82)",
                  border: `1.5px solid ${meta.accent}66`,
                }}
              >
                <img
                  src={illustrationSrc}
                  alt={`${report.name} illustration`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="relative z-10 max-w-7xl mx-auto md:px-5">
          <div className="relative px-3 left-0 right-0 bottom-0 pr-10 bg-white/8 rounded-tr-3xl py-3 backdrop-blur-sm max-w-max">
            <Breadcrumb
              crumbs={[
                { label: "Home", href: "/" },
                { label: "Reports", href: "/personalized-astrology-reports" },
                {
                  label:
                    report?.name?.length > 32
                      ? `${report.name.slice(0, 32)}...`
                      : report?.name,
                  href: `/personalized-astrology-reports/${report.slug}`,
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Jewel Accent Strip */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${meta.accent}, #d4af37)` }}
      />

      {/* Section 1: Detailed Report Preview & Highlights */}
      <div style={{ backgroundColor: meta.softTint }}>
        <section className="max-w-7xl mx-auto px-5 py-12 lg:py-14">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 max-w-xl">
              <p
                className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
                style={{ color: "#424874" }}
              >
                Inside Your Dossier
              </p>
              <h2 className="text-[28px] lg:text-[34px] leading-tight text-[#1a1a2e] mb-4">
                Key Insights Covered in{" "}
                <span className="text-gold">{report.name}</span>
              </h2>
              <p className="text-[#4a4a68] text-[15px] leading-relaxed mb-7">
                {report.description || report.shortDescription}
              </p>

              <div className="space-y-4 mb-8">
                {keyBenefits.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 bg-white/90 rounded-xl p-4 border shadow-xs"
                    style={{ borderColor: meta.borderTint }}
                  >
                    <span
                      className="shrink-0 w-7 h-7 font-heading rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: meta.jewelSurface }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      {item.title && (
                        <h3 className="text-sm font-bold text-primary mb-0.5">
                          {item.title}
                        </h3>
                      )}
                      <p className="text-[#444460] text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {purchasable ? (
                <div className="flex flex-wrap items-center gap-5">
                  <button
                    type="button"
                    onClick={handleOrderNow}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-gold text-white text-sm font-medium tracking-wide transition-colors duration-300 cursor-pointer"
                  >
                    Order Now
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-primary font-heading">
                        {convert(displayTotal)}
                      </span>
                      {report.originalPrice && (
                        <span className="text-sm line-through text-black/40">
                          {convert(report.originalPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-black/45 text-[11px] font-body">
                      {report.priceBreakdown?.taxAmount > 0
                        ? `Incl. ${report.priceBreakdown.rate}% GST`
                        : "Inclusive of all taxes"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Coming Soon — Pricing Pending
                    </p>
                    <p className="text-xs text-amber-800/80">
                      This canonical report edition is currently awaiting commercial release.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/contact-us/")}
                    className="shrink-0 px-4 py-2 rounded-lg bg-amber-900 text-white text-xs font-medium hover:bg-amber-800 transition-colors cursor-pointer"
                  >
                    Notify Me
                  </button>
                </div>
              )}
            </div>

            {/* Right Spot Illustration + Portrait Preview Card */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div
                className="relative rounded-3xl p-6 sm:p-8 shadow-xl max-w-md w-full flex flex-col items-center"
                style={{
                  background: meta.jewelSurface,
                  border: `1.5px solid ${meta.borderTint}`,
                }}
              >
                <div className="w-full max-w-[270px] aspect-210/297 rounded-xl overflow-hidden shadow-2xl mb-5">
                  <img
                    src={coverSrc}
                    alt={report.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (e.currentTarget.src !== meta.coverImage) {
                        e.currentTarget.src = meta.coverImage;
                      }
                    }}
                  />
                </div>
                <div className="w-full flex items-center justify-between gap-3 pt-4 border-t border-white/15">
                  <div className="flex items-center gap-3">
                    <img
                      src={illustrationSrc}
                      alt=""
                      aria-hidden="true"
                      className="w-12 h-9 object-contain"
                    />
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wider">
                        Digital A4 PDF
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {meta.badgeLabel}
                      </p>
                    </div>
                  </div>
                  <img
                    src={SHARED_REPORT_ASSETS.insightStar}
                    alt=""
                    aria-hidden="true"
                    className="w-5 h-5 opacity-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2: Analytical Methodology & Delivery Timeline */}
      <section className="max-w-7xl mx-auto px-5 py-12 lg:py-14">
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
          <div className="flex-1 max-w-xl">
            <p className="text-primary text-sm font-medium tracking-wide mb-2">
              {report.name}
            </p>
            <h2 className="text-[28px] lg:text-[34px] leading-tight text-primary mb-4">
              Who Can Benefit from{" "}
              <span className="text-gold">{report.name}?</span>
            </h2>
            <p className="text-[#555570] text-[15px] leading-relaxed mb-6">
              {summaryText}
            </p>
            <div
              className="rounded-2xl p-6 flex items-center gap-5 border"
              style={{
                background: meta.jewelSurface,
                borderColor: meta.borderTint,
              }}
            >
              <img
                src={illustrationSrc}
                alt={`${report.name} diagram`}
                className="w-28 h-20 object-contain shrink-0"
              />
              <div className="text-white">
                <p className="text-xs uppercase tracking-widest text-gold mb-1">
                  100% Deterministic Calculations
                </p>
                <p className="text-sm text-white/85 leading-relaxed">
                  Generated strictly from Swiss Ephemeris coordinates, classical
                  Vedic rules, and your exact birth timezone.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-xl space-y-5 lg:pt-6">
            {featureTimeline.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="relative flex flex-col items-center shrink-0 pt-0.5">
                  <img
                    src={SHARED_REPORT_ASSETS.timelineMarker}
                    alt=""
                    aria-hidden="true"
                    className="w-7 h-9 object-contain z-10"
                  />
                  {i !== featureTimeline.length - 1 && (
                    <span className="w-px h-14 border-l-2 border-dashed border-gold/60 mt-1" />
                  )}
                </div>
                <div className="pt-1">
                  <h3 className="text-[#1a1a2e] text-lg font-bold">
                    {item.title}
                  </h3>
                  <p className="text-[#555570] text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AboutAstrologer />
      <Include report={report} meta={meta} />
      <TestimonialsSection />
      <FaqSection faqs={report.faqs} />

      <LoginRequiredModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        redirectTo={`/report-order/${report.slug || slug}`}
      />
    </>
  );
}
