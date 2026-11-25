/* eslint-disable no-unused-vars */
import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LayoutDashboard,
  BookOpen,
  ShoppingBag,
  LogOut,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import LogoutConfirm from "@/utils/LogoutConfirm";

const dropdownVariants = (dropUp) => ({
  hidden: { opacity: 0, y: dropUp ? 8 : -8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: dropUp ? 6 : -6,
    scale: 0.96,
    transition: { duration: 0.14, ease: "easeIn" },
  },
});

const MENU_ITEMS = [
  { label: "My Profile", path: "/dashboard", icon: User },
  { label: "My Orders", path: "/orders", icon: ShoppingBag },
  { label: "My Bookings", path: "/consultations", icon: BookOpen },
];

export default function ProfileDropdown({ isOpen, onClose, triggerRef, dropUp = false }) {
  const { user, logout } = useAuthStore();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleNavigate = useCallback(
    (path) => {
      const tab = path === "/dashboard" ? "profile" : path.replace(/^\//, "");
      navigate(`/dashboard?tab=${tab}`);
      onClose();
    },
    [navigate, onClose],
  );

  const handleLogout = useCallback(() => {
    logout();
    onClose();
    navigate("/");
  }, [logout, navigate, onClose]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            variants={dropdownVariants(dropUp)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute right-0 w-56 rounded-2xl overflow-hidden z-50 bg-white border border-black/8 ${
              dropUp ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+10px)]"
            }`}
            style={{
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.07)",
            }}
            role="menu"
            aria-label="Profile menu"
          >
            <div className="px-4 pt-4 pb-3 border-b border-black/6 bg-secondary/30">
              <div className="flex items-center gap-2.5">
                {user?.picture?.url ? (
                  <img
                    src={user.picture.url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <User size={15} className="text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-black/35 font-body leading-none mb-0.5">
                    Signed in as
                  </p>
                  <p className="text-[13px] font-heading text-primary truncate leading-snug">
                    {user?.firstName
                      ? `${user.firstName} ${user.lastName || ""}`.trim()
                      : user?.email || "User"}
                  </p>
                </div>
              </div>
            </div>

            <div className="py-1.5">
              {MENU_ITEMS.map(({ label, path, icon: Icon }, i) => (
                <motion.button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate(path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body text-black/65 hover:text-primary hover:bg-secondary/40 transition-all duration-150 focus-visible:outline-none focus-visible:bg-secondary/40"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Icon size={14} className="text-primary/70 shrink-0" />
                  {label}
                </motion.button>
              ))}
            </div>

            <div className="border-t border-black/6 py-1.5">
              <motion.button
                type="button"
                role="menuitem"
                onClick={() => setIsLogoutOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body text-red-500 hover:bg-red-50 transition-all duration-150 focus-visible:outline-none focus-visible:bg-red-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <LogOut size={14} className="shrink-0" />
                Logout
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LogoutConfirm
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
