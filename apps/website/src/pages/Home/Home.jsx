import { lazy, Suspense } from "react";

import HeroSection from "./HeroSection";
import Seo from "../../components/Seo.jsx";
import WebsiteSchema from "../../components/schema/WebsiteSchema.jsx";
import LazySection from "../../components/LazySection.jsx";
import AboutAstrologer from "./Aboutastrologer";
import OnlineAstrology from "./OnlineAstrology";


const ConsultationSection = lazy(() => import("./Consultationsection"));
const AstrologicalSolutions = lazy(() => import("./Astrologicalsolutions"));
const KundliSection = lazy(() => import("./Kundlisection.jsx"));
const CourseSection = lazy(() => import("../Course/CourseSection.jsx"));
const FeaturedProducts = lazy(() => import("../Products/Featuredproducts.jsx"));
const CelebritySection = lazy(() => import("./Celebritysection.jsx"));
const TestimonialsSection = lazy(() => import("./Testimonialssection.jsx"));
const GuidingCarousel = lazy(() => import("./Guiding.jsx"));
const Blogsection = lazy(() => import("../Blogs/Blogsection.jsx"));
const MediaSection = lazy(() => import("./Mediasection.jsx"));
const FaqSection = lazy(() => import("../Faqs/Faqsection.jsx"));
const MediaPress = lazy(() => import("./Mediapress.jsx"));

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=919621127233&text=Namaste+Astro+Sushil+Ji&type=phone_number&app_absent=0";

function Home() {
  return (
    <>
     
      <Seo page="home" />
      <WebsiteSchema />

      {/* Above the fold — load immediately */}
      <HeroSection />
      <AboutAstrologer />

      {/* Below the fold — defer chunk download until near viewport */}
      <LazySection>
        <Suspense fallback={null}>
          <CelebritySection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <AstrologicalSolutions />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <MediaSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <OnlineAstrology />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <KundliSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <ConsultationSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <MediaPress />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <CourseSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <FeaturedProducts />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <TestimonialsSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <GuidingCarousel />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <Blogsection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <FaqSection />
        </Suspense>
      </LazySection>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform duration-200"
      >
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/logo/whatsapp-logo-56x56.webp"
          />
          <img
            src="/logo/whatsapp-logo.webp"
            alt="WhatsApp"
            width={56}
            height={56}
            className="w-full h-full object-contain"
          />
        </picture>
      </a>
    </>
  );
}

export default Home;
