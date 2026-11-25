/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { Menu, X, User, ShoppingCart } from "lucide-react";
import React, {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useCartStore } from "../../store/useCartStore";
import { useCurrencyStore } from "../../store/useCurrencyStore";
import { useSettingStore } from "../../store/usSettingStore";
import { CartDropdown } from "../../pages/Cart/CartDropdown";

const DEFAULT_TOP_BAR = {
  enabled: true,
  text: "✨ Astro Sushil in Mumbai | 25th, 26th & 27th September 2026 ✨",
  bgColor: "#ffffff",
  textColor: "#ef4444",
  linkEnabled: false,
  linkUrl: "",
};

const TopBar = () => {
  const settings = useSettingStore((s) => s.settings);

  // Before settings load, fall back to the previous hardcoded strip so
  // there's no flash of nothing on first paint.
  const topBar = { ...DEFAULT_TOP_BAR, ...settings?.topBar };

  if (!topBar.enabled || !topBar.text) return null;

  const content = (
    <>
      <div
        className="hidden sm:block h-0.5 w-full max-w-md rounded-full"
        style={{
          background: `linear-gradient(to right, transparent, ${topBar.textColor}, ${topBar.textColor})`,
        }}
      />
      <p
        className="text-center text-xs sm:text-sm md:text-xl font-body font-bold tracking-wide sm:whitespace-nowrap"
        style={{ color: topBar.textColor }}
      >
        <span
          className="inline-block px-3 py-1 sm:px-0 sm:py-0 rounded-full sm:rounded-none border sm:border-0"
          style={{ borderColor: `${topBar.textColor}40` }}
        >
          {topBar.text}
        </span>
      </p>
      <div
        className="hidden sm:block h-0.5 w-full max-w-md rounded-full"
        style={{
          background: `linear-gradient(to left, transparent, ${topBar.textColor}, ${topBar.textColor})`,
        }}
      />
    </>
  );

  const baseClass =
    "relative py-2.5 sm:py-3 flex items-center justify-center gap-2 sm:gap-3 max-w-7xl mx-auto px-3 sm:px-6 md:px-10";
  const isExternal = /^https?:\/\//.test(topBar.linkUrl);

  return (
    <div
      style={{ backgroundColor: topBar.bgColor }}
      className="overflow-hidden"
    >
      {topBar.linkEnabled && topBar.linkUrl ? (
        isExternal ? (
          <a
            href={topBar.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClass} cursor-pointer`}
          >
            {content}
          </a>
        ) : (
          <Link to={topBar.linkUrl} className={`${baseClass} cursor-pointer`}>
            {content}
          </Link>
        )
      ) : (
        <div className={baseClass}>{content}</div>
      )}
    </div>
  );
};

const DEFAULT_HIGHLIGHTS_BAR = {
  enabled: false,
  text: "",
  bgColor: "#121045",
  textColor: "#ffffff",
  linkEnabled: false,
  linkUrl: "",
};

const MARQUEE_PX_PER_SEC = 35;

const HighlightsBar = () => {
  const settings = useSettingStore((s) => s.settings);
  const highlightsBar = {
    ...DEFAULT_HIGHLIGHTS_BAR,
    ...settings?.highlightsBar,
  };

  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [marquee, setMarquee] = useState({ on: false, duration: 15 });

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !textRef.current) return;
      const textWidth = textRef.current.scrollWidth;
      const overflowing = textWidth > containerRef.current.clientWidth;
      setMarquee({
        on: overflowing,
        duration: Math.max(textWidth / MARQUEE_PX_PER_SEC, 6),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [highlightsBar.text]);

  if (!highlightsBar.enabled || !highlightsBar.text) return null;

  const textClass =
    "px-4 sm:px-6 text-xs sm:text-sm md:text-2xl font-body font-bold tracking-wide whitespace-nowrap";

  const inner = marquee.on ? (
    <div
      className="flex w-max animate-marquee"
      style={{ animationDuration: `${marquee.duration}s` }}
    >
      <span ref={textRef} className={textClass}>
        {highlightsBar.text}
      </span>
      <span aria-hidden="true" className={textClass}>
        {highlightsBar.text}
      </span>
    </div>
  ) : (
    <span ref={textRef} className={`${textClass} py-2`}>
      {highlightsBar.text}
    </span>
  );

  const baseClass = `w-full border-y border-gold flex items-center py-1 overflow-hidden ${
    marquee.on ? "justify-start" : "justify-center"
  }`;
  const isExternal = /^https?:\/\//.test(highlightsBar.linkUrl);

  return (
    <div
      style={{
        backgroundColor: highlightsBar.bgColor,
        color: highlightsBar.textColor,
      }}
    >
      {highlightsBar.linkEnabled && highlightsBar.linkUrl ? (
        isExternal ? (
          <a
            ref={containerRef}
            href={highlightsBar.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${baseClass} cursor-pointer hover:opacity-90 transition-opacity`}
          >
            {inner}
          </a>
        ) : (
          <Link
            ref={containerRef}
            to={highlightsBar.linkUrl}
            className={`${baseClass} cursor-pointer hover:opacity-90 transition-opacity`}
          >
            {inner}
          </Link>
        )
      ) : (
        <div ref={containerRef} className={baseClass}>
          {inner}
        </div>
      )}
    </div>
  );
};

const ProfileDropdown = React.lazy(
  () => import("../../pages/Profile/Profiledropdown"),
);

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us/" },
  { label: "Kundli", href: "/free-online-kundli" },
  { label: "Courses", href: "/courses/" },
  { label: "Consultations", href: "/online-consultations/" },
  { label: "Products", href: "/products/" },
  { label: "Reports", href: "/personalized-astrology-reports" },
  { label: "Contact Us", href: "/contact-us/" },
  { label: "Blogs", href: "/blog/" },
];

function useCartCount() {
  const cart = useCartStore((s) => s.cart);
  const items = cart?.items ?? (Array.isArray(cart) ? cart : []);
  return items.reduce((sum, i) => sum + (i.quantity || 0), 0);
}

const CartButton = ({ isMobile = false }) => {
  const count = useCartCount();
  const { getCartItems } = useCartStore();
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (token) getCartItems();
  }, [token]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Cart (${count} items)`}
        aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-gold"
      >
        <img
          src="/Image/Cart.png"
          alt="Cart"
          aria-hidden="true"
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          className="w-8 h-8 object-contain"
        />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-gold text-black text-[12px] font-medium font-body flex items-center justify-center leading-none shadow">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <CartDropdown onClose={() => setOpen(false)} wrapRef={wrapRef} />
      )}
    </div>
  );
};

const Navbar = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const getProfile = useAuthStore((s) => s.getProfile);
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const supportedCurrencies = useCurrencyStore((s) => s.supportedCurrencies);
  const fetchRates = useCurrencyStore((s) => s.fetchRates);
  const fetchSettings = useSettingStore((s) => s.fetchSettings);
  const [menuOpen, setMenuOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const drawerRef = useRef(null);
  const profileBtnDesktopRef = useRef(null);
  const profileBtnMobileRef = useRef(null);

  useEffect(() => {
    if (token && !user) getProfile();
  }, [token, user, getProfile]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = useCallback(() => {
    setMenuOpen(false);
  }, []);
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);
  const toggleProfile = useCallback(() => setProfileOpen((p) => !p), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);

  return (
    <>
      <TopBar />

      <header
        role="banner"
        className={`w-full sticky top-0 z-50 border-b border-white/10 transition-all duration-300 ${
          scrolled ? "bg-primary/50 backdrop-blur" : "bg-[#121045]"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-5">
          <Link
            to="/"
            aria-label="Astro Sushil - Home"
            className="flex items-center gap-2 shrink-0"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
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
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
              </picture>
            </div>
          </Link>

          <nav
            role="navigation"
            aria-label="Main navigation"
            className="hidden lg:flex items-center gap-5 xl:gap-7"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                to={href}
                onClick={() => handleNavClick(label)}
                aria-current={location.pathname === href ? "page" : undefined}
                className={`relative text-[15px] xl:text-[18px] leading-[100%] tracking-wide transition-colors duration-200 pb-0.5 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                ${
                  location.pathname === href
                    ? "text-[#F4C542] border-b border-[#F4C542]"
                    : "text-white/90"
                }`}
              >
                {label === "Kundli" && (
                  <span className="font-medium absolute -bottom-8 -right-4 -translate-y-1/2 text-gold text-xs bg-[#F4C542]/10 px-1.5 py-0.5 rounded-full">
                    Free
                  </span>
                )}
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <label htmlFor="currency" className="sr-only">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              name="currency"
              id="currency"
              className="bg-white text-black rounded-md px-3 py-1.5 outline-none cursor-pointer text-[14px] font-medium"
            >
              {Object.entries(supportedCurrencies).map(([code, config]) => (
                <option key={code} value={code}>
                  {code} ({config.symbol})
                </option>
              ))}
            </select>

            {token && user ? (
              <div className="relative">
                <button
                  ref={profileBtnDesktopRef}
                  type="button"
                  onClick={toggleProfile}
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  className="flex items-center cursor-pointer gap-2 bg-gold hover:bg-gold/80 border border-gold/30 text-white rounded-lg px-3 py-1.5 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {user?.picture?.url ? (
                    <img
                      src={user.picture.url}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-gold/40"
                    />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                  <span className="text-[13px] font-medium text-white max-w-20 truncate">
                    {user?.firstName || "Account"}
                  </span>
                </button>
                <Suspense fallback={null}>
                  <ProfileDropdown
                    isOpen={profileOpen}
                    onClose={closeProfile}
                    triggerRef={profileBtnDesktopRef}
                  />
                </Suspense>
              </div>
            ) : (
              <Link
                to="/dashboard/"
                className="bg-gold text-white rounded-md px-5 py-2 text-[14px] font-medium hover:opacity-90 active:scale-95 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1"
              >
                Login
              </Link>
            )}

            <CartButton />
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <CartButton isMobile />
            <button
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex items-center justify-center bg-transparent border border-white/20 text-white rounded-md p-2 cursor-pointer transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <HighlightsBar />

      {/* Mobile backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer — pure CSS transform */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 left-0 z-50 h-full w-[80vw] max-w-[320px] bg-primary shadow-2xl flex flex-col lg:hidden
          transition-transform duration-300 ease-out will-change-transform
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link
            to="/"
            aria-label="Astro Samarth - Home"
            onClick={() => setMenuOpen(false)}
          >
            <picture>
              <source media="(max-width: 768px)" srcSet="/logo/logo.webp" />
              <img
                src="/logo/logo.webp"
                alt="Astro Samarth"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 object-contain"
              />
            </picture>
          </Link>
          <button
            onClick={toggleMenu}
            aria-label="Close menu"
            className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X size={22} />
          </button>
        </div>

        <nav
          role="navigation"
          aria-label="Mobile navigation"
          className="flex-1 overflow-y-auto py-2"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              onClick={() => handleNavClick(label)}
              aria-current={location.pathname === href ? "page" : undefined}
              className={`flex items-center px-6 py-3.5 text-[16px] border-b border-white/5 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-white/10
                ${
                  location.pathname === href
                    ? "text-gold bg-gold/10 font-medium"
                    : "text-white/85 hover:text-gold hover:bg-white/5"
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10 bg-white/5">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Select currency"
            className="bg-white text-black rounded-md px-3 py-1.5 outline-none cursor-pointer text-[14px] font-medium flex-1"
          >
            {Object.entries(supportedCurrencies).map(([code, config]) => (
              <option key={code} value={code}>
                {code} ({config.symbol})
              </option>
            ))}
          </select>
          {token ? (
            <div className="relative shrink-0">
              <button
                ref={profileBtnMobileRef}
                type="button"
                onClick={toggleProfile}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 border border-gold/30 text-white rounded-lg px-3 py-1.5 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-gold"
              >
                {user?.picture?.url ? (
                  <img
                    src={user.picture.url}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-gold/40"
                  />
                ) : (
                  <User size={16} className="text-gold" />
                )}
                <span className="text-[13px] font-medium text-white max-w-20 truncate">
                  {user?.firstName || "Account"}
                </span>
              </button>
              <Suspense fallback={null}>
                <ProfileDropdown
                  isOpen={profileOpen}
                  onClose={closeProfile}
                  triggerRef={profileBtnMobileRef}
                  dropUp
                />
              </Suspense>
            </div>
          ) : (
            <Link
              to="/dashboard/"
              className="bg-gold text-white rounded-md px-5 py-2 text-[14px] font-medium hover:opacity-90 active:scale-95 transition-all duration-150 shrink-0 focus-visible:ring-2 focus-visible:ring-gold"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(Navbar);
