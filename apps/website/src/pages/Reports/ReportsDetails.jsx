/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FaqSection from "../Faqs/Faqsection";
import useReportStore from "@/store/useReportStore";
import { useCurrency } from "../../hooks/useCurrency";
import TestimonialsSection from "../Home/Testimonialssection";
import AboutAstrologer from "../Home/Aboutastrologer";
import { Breadcrumb } from "../../components/HeroPage";
import Include from "./Include";
import { useAuthStore } from "@/store/useAuthStore";
import LoginRequiredModal from "@/utils/LoginRequiredModal";

const REPORT_HEADER_CONTENT = {
  match_making_pdf:
    "Anyone looking for a happy, stable marriage can benefit from a detailed couple compatibility test. It is especially helpful for couples who want to understand their emotional bond, financial luck, and family harmony before taking the big step. By matching your birth charts, you can easily fix planetary flaws, avoid future conflicts, and build a peaceful life together.",
  pro_horoscope_pdf:
    "This is an advanced life report that can be useful for anyone who is thinking of making a big change in their career, investments, or business. It is particularly useful for those who are professionals or entrepreneurs at a crucial juncture and to understand when to take calculated risks. Understanding your key planetary cycles can help you identify potential wealth gains, prevent losses,  shape your future trajectory.",
  mini_horoscope_pdf:
    "A short-term planetary roadmap can be useful for anyone who wants to remain vigilant for the next few months. It is particularly useful for coping with unexpected changes in your work, schooling, or lifestyle without getting overwhelmed. Monitoring planet transitions that occur at a rapid pace allows you to take advantage of sudden opportunities, avoid poor days, and maintain a normal routine.",
  basic_horoscope_pdf:
    "A basic birth chart reading can be helpful for anyone who is new to astrology and is looking to find out more about themselves. It's particularly useful for discovering your innate abilities, personality characteristics, and best career paths. By understanding your core rashi and planetary positions, you can get instant clarity on your strengths and find your right path in life.",
};

export default function ReportsDetails() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { report, loading, getReportBySlug } = useReportStore();
  const { convert } = useCurrency();
const { user } = useAuthStore();


const handleOrderNow = () => {
  if (!user) {
    navigate("/register/");
    return;
  }

  navigate(`/report-order/${slug}`);
};
  useEffect(() => {
    if (slug) getReportBySlug(slug);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!report) return null;

  const content =
    REPORT_HEADER_CONTENT[report.reportType] ?? report.shortDescription;
  const lines = content.split(". ").filter(Boolean);

  return (
    <>
      <section
        className="select-none relative overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/Image/reports-bg.webp')",
          zIndex: -1,
        }}
      >
        <div
          className="absolute inset-0 bg-linear-to-r from-[#100D42] via-[#100D42]/30 to-[#100D42] -z-10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-linear-to-l from-[#100D42] via-[#100D42]/30 to-[#100D42] -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto pt-8 px-5 w-full grid grid-cols-1 md:grid-cols-3 gap-10 items-start justify-between">
          {/* Left Section */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-4xl  font-bold text-white mb-6">
              {report.name.split(" ")[0] || ""}{" "}
              <span className="text-gold">
                {report.name.split(" ")[1] || ""}
              </span>
            </h2>
            <div className="text-lg tracking-normal max-w-4xl mx-auto text-white mb-4 space-y-2">
              {lines.map((line, index) => (
                <p key={index}>
                  {line.trim() + (line.endsWith(".") ? "" : ".")}
                </p>
              ))}
            </div>
          </div>

          {/* Right Section */}
          <div className="col-span-1">
            <img
              src="/Image/report-details.png"
              alt="Report"
              className="h-80 w-80 mx-auto md:ml-auto object-contain animate-spin [animation-duration:8s]"
            />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto md:px-5">
          <div className="relative px-3 left-0 right-0 bottom-0 pr-10 bg-white/5 rounded-tr-3xl py-3 backdrop-blur-sm max-w-max">
            <Breadcrumb
              crumbs={[
                { label: "Home", href: "/" },
                { label: "Reports", href: "/personalized-astrology-reports" },
                {
                  label:
                    report?.name?.length > 30
                      ? `${report.name.slice(0, 30)}...`
                      : report?.name,
                  href: "/home",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="">
        <div className="bg-secondary">
          <section className="max-w-7xl mx-auto px-5 py-8 lg:py-8">
            <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
              <div className="flex-1 max-w-xl">
                {/* <p className="text-primary text-sm font-medium tracking-wide mb-3">
                  {report.name}
                </p> */}

                <h2 className="text-[28px] lg:text-[34px] leading-tight text-[#1a1a2e] mb-5">
                  <span className="text-primary">
                    {report.name.split(" ")[0]}
                  </span>{" "}
                  <span className="text-gold">{report.name.split(" ")[1]}</span>
                </h2>

                <p className="text-[#555570] text-[14.5px] leading-relaxed mb-8">
                  {report.shortDescription}
                </p>

                <div className="space-y-3 mb-10">
                  {report.benefits?.map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="shrink-0 w-7 h-7 font-heading rounded-full bg-white border border-secondary flex items-center justify-center text-primary text-base font-bold">
                        {i + 1}
                      </span>
                      <p className="text-[#444460] text-sm leading-relaxed pt-0.5">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <button
                   onClick={handleOrderNow}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-primary hover:bg-gold text-white text-sm font-medium tracking-wide transition-colors duration-700 cursor-pointer"
                  >
                    Order Now
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>

                  <div className="flex flex-col">
                    <span className="text-lg md:text-xl font-bold text-primary">
                      {convert(report.salePrice)}
                    </span>
                    <span className="text-black/35 text-[11px] font-body">
                      {report.gst?.type === "inclusive"
                        ? "Inclusive of GST"
                        : "Exclusive of GST"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <img
                  src="/Image/card-frame.png"
                  alt=""
                  aria-hidden="true"
                  className="w-full max-w-lg h-140 object-contain bg-no-repeat bg-center drop-shadow-2xl drop-shadow-golden rounded-lg"
                />
                <img
                  src={report.coverImage}
                  alt={report.name}
                  className="absolute w-full max-w-lg h-120 md:h-138 object-contain drop-shadow-2xl  rounded-lg p-6"
                />
              </div>
            </div>
          </section>
        </div>

        <section className="max-w-7xl mx-auto px-5 py-8 lg:py-8">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
            <div className="flex-1 max-w-xl">
              <p className="text-primary text-sm font-medium tracking-wide mb-3">
                {report.name}
              </p>

              <h2 className="text-[28px] lg:text-[34px] leading-tight text-primary mb-5">
                Who Can Benefit from a{" "}
                <span className="text-gold">{report.name} Analysis?</span>
              </h2>

              <p className="text-[#555570] text-[14.5px] leading-relaxed mb-8">
                {report.description}
              </p>

              <div className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] shadow-lg aspect-video max-w-xl">
                <img src="/Image/Reports.webp" alt="" />{" "}
              </div>
            </div>

            <div className="flex-1 max-w-xl space-y-5 lg:pt-14">
              {report.features?.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="relative flex flex-col items-center shrink-0">
                    <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-sm z-10">
                      {i + 1}
                    </span>

                    {i !== report.features.length - 1 && (
                      <span className="absolute top-5 w-px h-24 border-l-2 border-dashed border-gold" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[#1a1a2e] text-lg font-bold">
                      {item.title}
                    </h3>
                    <p className="text-[#555570] text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-4 pt-3">
                <button
                  onClick={handleOrderNow}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-primary hover:bg-gold text-white text-sm font-medium tracking-wide transition-colors duration-700 cursor-pointer"
                >
                  Order Now
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>

                <div className="flex flex-col">
                  <span className="text-lg md:text-xl font-bold text-primary">
                    {convert(report.salePrice)}
                  </span>
                  <span className="text-black/35 text-[11px] font-body">
                    {report.gst?.type === "inclusive"
                      ? "Inclusive of GST"
                      : "Exclusive of GST"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <AboutAstrologer />
        <Include />
        <TestimonialsSection />
        <FaqSection faqs={report.faqs} />
      </div>
      
    </>
  );
}
