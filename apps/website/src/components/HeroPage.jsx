/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

const DEFAULT_BG = "/Image/page-hero-bg.webp";

export function Breadcrumb({ crumbs = [] }) {
  if (!crumbs.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 flex-wrap"
    >
      <Link
        to="/"
        className="text-white/60 hover:text-gold transition-colors text-xs sm:text-sm
                   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded"
        aria-label="Home"
      >
        <Home size={24} aria-hidden="true" />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight
              size={12}
              className="text-white/30"
              aria-hidden="true"
            />
            {isLast ? (
              <span
                className="text-gold text-xs sm:text-lg font-medium font-body"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className="text-white/60 hover:text-white transition-colors text-xs sm:text-lg  rounded"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function PageHero({
  title = "Page Title",
  highlight = "",
  subtitle = "",
  breadcrumbs = [],
  image = DEFAULT_BG,
  align = "center",
  minHeight = "min-h-[20vh]",
  ctaBtn = "",
}) {
  const isCenter = align === "center";

  const renderTitle = () => {
    if (!highlight || !title.includes(highlight)) {
      return <span>{title}</span>;
    }
    const [before, after] = title.split(highlight);
    return (
      <>
        {before}
        <span className="text-gold">{highlight}</span>
        {after}
      </>
    );
  };

  return (
    <header
      role="banner"
      className={`relative w-full ${minHeight} flex flex-col items-center overflow-hidden`}
    >
      <img
        src={image}
        alt={title}
        aria-hidden="true"
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      <div
        className="absolute inset-0 bg-linear-to-r from-[#100D42] via-[#100D42]/60 to-[#100D4200]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-linear-to-b from-[#100D42] via-[#100D42]/60 to-[#100D4200]"
        aria-hidden="true"
      />

      <div
        className={`
          relative z-10
          px-5
          mx-auto
          max-w-7xl
          py-14 sm:py-16 lg:py-20
          flex flex-col gap-4
          ${isCenter ? "items-center text-center" : "items-start text-left"}
        `}
      >
        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
          className="font-heading text-white leading-tight
                     text-xl sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl
                     max-w-7xl"
        >
          {renderTitle()}
        </motion.p>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="text-white text-sm sm:text-base lg:text-xl  leading-relaxed max-w-5xl"
          >
            {subtitle.split(". ")[0]}.
            <br />
            {subtitle.split(". ")[1] || ""}
          </motion.p>
        )}
      </div>
      <div className="w-full relative max-w-7xl mx-auto px-5 flex justify-end">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute left-6 bottom-0 z-20 pr-10 bg-white/5 rounded-tr-3xl px-3 py-3 backdrop-blur-sm max-w-max pointer-events-auto"
        >
          <Breadcrumb crumbs={breadcrumbs} />
        </motion.div>

        {ctaBtn && (
          <Link
            to="/"
            className="group relative overflow-hidden flex items-center gap-2 rounded-full bg-linear-to-r from-gold via-yellow-400 to-gold px-6 py-3 text-xs md:text-sm font-semibold text-black shadow-lg shadow-gold/20 transition-all duration-300 hover:shadow-xl hover:shadow-gold/30 m-2 cursor-pointer"
          >
            <span className="hidden md:block relative z-10">{ctaBtn}</span>
            <span className="relative md:hidden z-10">Talk To Astrologer</span>
            <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>

            {/* Shine effect */}
            <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
        )}
      </div>
    </header>
  );
}
