/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ShoppingBag,
  FileText,
  Heart,
  CalendarCheck,
  Download,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import MyConsultationsPage from "./Myconsultationspage";
import MyOrdersPage from "./MyOrders";
import MyProfile from "./Profile";
import DownloadsSection from "./Downloadssection";
import MyReportsSection from "./Myreportssection";
import Seo from "../../components/Seo";
import WishlistPage from "./Wishlistpage";
import LogoutConfirm from "@/utils/LogoutConfirm";
import PageHero from "@/components/HeroPage";

const NAV_ITEMS = [
  { label: "My Profile", icon: User, path: "/dashboard" },
  { label: "My Orders", icon: ShoppingBag, path: "/orders" },
  {
    label: "My Consultations",
    icon: CalendarCheck,
    path: "/consultations",
  },
  { label: "My Reports", icon: FileText, path: "/reports" },
  { label: "Wishlist", icon: Heart, path: "/wishlist" },
  { label: "Downloads", icon: Download, path: "/downloads" },
];

const TAB_QUERY_MAP = {
  profile: "/dashboard",
  dashboard: "/dashboard",
  orders: "/orders",
  reports: "/reports",
  wishlist: "/wishlist",
  consultations: "/consultations",
  downloads: "/downloads",
};

const PATH_TO_TAB = Object.fromEntries(
  Object.entries(TAB_QUERY_MAP).map(([key, value]) => [value, key]),
);

function ComingSoon({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 gap-3"
    >
      <p className="font-heading text-black/30 text-xl">{label}</p>
      <p className="text-black/25 text-sm font-body">Coming soon</p>
    </motion.div>
  );
}

function SideLink({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.path)}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-body font-medium text-left  focus-visible:outline-none cursor-pointer focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-gold/40
        ${active ? "bg-primary rounded-l-lg text-white shadow-sm rounded-tr-3xl  " : "text-primary bg-secondary  rounded-l-lg rounded-tr-3xl  border-dashed border"}`}
    >
      <span className="hidden md:block h-6 w-6 rounded-full bg-white absolute left-1"></span>
      <item.icon size={16} className="shrink-0" />
      {item.label}
    </button>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { logout, user, token, getProfile } = useAuthStore();

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [activePath, setActivePath] = useState(() => {
    const queryTab = searchParams.get("tab")?.toLowerCase();
    return TAB_QUERY_MAP[queryTab] || location.state?.tab || "/dashboard";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      setActivePath(location.state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    const queryTab = searchParams.get("tab")?.toLowerCase();
    if (queryTab) {
      const tabPath = TAB_QUERY_MAP[queryTab];
      if (tabPath) {
        setActivePath(tabPath);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.has("tab")) {
      const tab = PATH_TO_TAB[activePath] || "profile";
      navigate(
        { pathname: location.pathname, search: `?tab=${tab}` },
        {
          replace: true,
        },
      );
    }
  }, [activePath, location.pathname, navigate, searchParams]);
  useEffect(() => {
    if (token && !user) getProfile();
  }, [token]);

  const activeItem =
    NAV_ITEMS.find((n) => n.path === activePath) || NAV_ITEMS[0];

  const handleNav = (path) => {
    setActivePath(path);
    const tab = PATH_TO_TAB[path] || "profile";
    navigate({ pathname: location.pathname, search: `?tab=${tab}` });
    setDrawerOpen(false);
  };
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const renderPanel = () => {
    switch (activePath) {
      case "/dashboard":
        return <MyProfile />;
      case "/orders":
        return <MyOrdersPage />;
      case "/reports":
        return <MyReportsSection />;
      case "/wishlist":
        return <WishlistPage />;
      case "/consultations":
        return <MyConsultationsPage />;
      case "/downloads":
        return <DownloadsSection />;
      default:
        return <MyProfile />;
    }
  };

  return (
    <>
      <Seo page="terms" />

      <PageHero
        title="Dashboard"
        highlight="Dashboard"
        subtitle="Your personal dashboard"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
        ]}
      />

      <div className=" bg-white flex flex-col">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-primary text-white shadow-md">
          <span className="font-heading text-base">{activeItem.label}</span>
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Toggle menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="h-full flex flex-1 max-w-7xl mx-auto w-full px-0 sm:px-4 lg:px-6 xl:px-8 py-0 lg:py-8 gap-0 lg:gap-6">
          <aside className="hidden lg:flex flex-col w-56 xl:min-w-72 shrink-0 rounded-2xl overflow-hidden shadow-lg self-start sticky top-24 px-4 bg-white">
            <nav className="flex flex-col py-2 gap-2">
              {NAV_ITEMS.map((item) => (
                <SideLink
                  key={item.path}
                  item={item}
                  active={activePath === item.path}
                  onClick={handleNav}
                />
              ))}
            </nav>
            <div className="mt-auto border-t border-white/10 py-2">
              <button
                type="button"
                onClick={() => setIsLogoutOpen(true)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-body text-red-500 hover:text-red-700 transition-all duration-200 focus-visible:outline-none bg-secondary border border-dashed border-red-500 rounded-l-lg rounded-tr-3xl"
              >
                <span className="hidden md:block h-6 w-6 rounded-full bg-white absolute left-1"></span>
                <LogOut size={16} className="shrink-0" />
                Logout
              </button>
            </div>
          </aside>

          <AnimatePresence>
            {drawerOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                  onClick={() => setDrawerOpen(false)}
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="fixed top-0 left-0 z-40 h-full w-64 bg-primary shadow-2xl flex flex-col lg:hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <p className="text-white font-heading text-base">Menu</p>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="text-white/60 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <nav className="flex flex-col py-2 flex-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => (
                      <SideLink
                        key={item.path}
                        item={item}
                        active={activePath === item.path}
                        onClick={handleNav}
                      />
                    ))}
                  </nav>
                  <div className="border-t border-white/10 py-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-body text-red-500 hover:text-red-700 transition-all"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <main className="flex-1  bg-white min-w-0">
            <div className="rounded-none lg:rounded-2xl h-full border-0  border-black/6 overflow-hidden">
              <div className="flex relative bg-primary items-center gap-3 px-6 py-4 border-b border-black/8  text-white">
                <span className="hidden md:block h-5 w-5 rounded-full bg-white absolute -left-2"></span>
                <activeItem.icon size={17} className="text-white shrink-0" />
                <h1 className="font-heading text-white text-lg">
                  {activeItem.label}
                </h1>
              </div>
              <div className="px-5 sm:px-8 py-7 sm:py-8 bg-secondary">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePath}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderPanel()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>

      <LogoutConfirm
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
