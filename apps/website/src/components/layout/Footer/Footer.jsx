import { ArrowRight } from "lucide-react";
import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
// import { Facebook, Twitter, Youtube, Instagram, Linkedin } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "About Sushil Ji", to: "/about-us/" },
  { label: "Courses", to: "/courses/" },
  { label: "Book Consultation", to: "/online-consultations/" },
  { label: "Our Products", to: "/products/" },
  { label: "Contact Us", to: "/contact-us/" },
];

const RESOURCES = [
  { label: "Terms & Conditions", to: "/terms-conditions/" },
  { label: "Privacy Policy", to: "/privacy-policy/" },
  {
    label: "Cancellation & Refund",
    to: "/cancellation-refund-policy/",
  },
  {
    label: "Shipping & Delivery",
    to: "/shipping-delivery-policy/",
  },
  { label: "Our Blogs", to: "/blog/" },
];

// const SOCIAL = [
//   {
//     icon: Facebook,
//     href: "https://facebook.com",
//     label: "Facebook",
//   },
//   {
//     icon: Twitter,
//     href: "https://x.com",
//     label: "X (Twitter)",
//   },
//   {
//     icon: Youtube,
//     href: "https://youtube.com",
//     label: "YouTube",
//   },
//   {
//     icon: Instagram,
//     href: "https://instagram.com",
//     label: "Instagram",
//   },
//   {
//     icon: Linkedin,
//     href: "https://linkedin.com",
//     label: "LinkedIn",
//   },
// ];

export default function Footer() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.load();
          video.play().catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      className="relative w-full text-white overflow-hidden"
      aria-label="Site footer"
    >
      {/* Background video */}
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        poster="/Image/footer-poster.webp"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      >
        <source
          src="https://astro-sushil.s3.ap-southeast-2.amazonaws.com/videos/footer.webm"
          type="video/webm"
        />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="py-5 w-full flex items-end justify-end px-6">
          <Link
            to={"/contact-us"}
            aria-label="Contact Us"
            className="group flex items-center gap-4 cursor-pointer text-white text-lg font-medium pl-6 pr-1 py-1 bg-[#8f6d16] rounded-full transition-colors duration-200"
          >
            <span>Contact Us</span>
            <span className="flex items-center justify-center h-12 w-12 p-2 bg-white rounded-full text-black">
              <ArrowRight
                size={20}
                className="-rotate-30 group-hover:rotate-0 transition-all duration-700"
              />
            </span>
          </Link>
        </div>

        {/* Top border line */}
        <div className="relative z-10 border-t border-white/15">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* ── Col 1: Logo + Social ── */}
            <div className="flex flex-col gap-6">
              <Link to="/" aria-label="Astro Sushil Home">
                <picture>
                  <source
                    media="(max-width: 767px)"
                    srcSet="/logo/logo-128x128.webp"
                  />
                  <img
                    src="/logo/logo.webp"
                    alt="Astro Sushil logo"
                    width={64}
                    height={64}
                    className="h-32 w-auto object-contain"
                    loading="lazy"
                  />
                </picture>
              </Link>

              {/* Social icons */}
              {/* <div className="flex items-center gap-3" role="list" aria-label="Social media links">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  role="listitem"
                  className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:text-white hover:border-white/60 transition-colors duration-200"
                >
                  <Icon size={15} strokeWidth={1.8} />
                </a>
              ))}
            </div> */}
            </div>

            <nav aria-label="Quick links">
              <h2 className="text-gold font-bold text-[22px] leading-none mb-5">
                Quick Links
              </h2>
              <ul className="flex flex-col  gap-2">
                {QUICK_LINKS.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-white text-[15px]  block">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h2 className="text-gold font-bold text-[22px] leading-none mb-5">
                Resources
              </h2>

              <ul className="flex flex-col  gap-2">
                {RESOURCES.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-white text-[15px]  block">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="text-gold font-bold text-[22px] leading-none mb-5">
                Contact
              </h2>
              <ul className="space-y-2">
                <li className="text-white/75 text-[15px] font-medium">
                  WhatsApp/Call
                </li>
                <li>
                  <a
                    href="tel:+919621127233"
                    className="text-white/75 text-[15px] hover:text-white transition-colors duration-200 block"
                    aria-label="Call +91-96211-27233"
                  >
                    +91-96211-27233
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+916393551359"
                    className="text-white/75 text-[15px] hover:text-white transition-colors duration-200 block"
                    aria-label="Call +91-63935-51359"
                  >
                    +91-63935-51359
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 py-4 text-center">
            <p className="text-white text-sm">©Copyright Astro-Sushil 2026</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
