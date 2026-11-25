/* eslint-disable no-unused-vars */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, LogIn, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 28, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 16,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -45 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 400, damping: 20, delay: 0.2 },
  },
};

const contentVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const LoginRequiredModal = ({
  isOpen,
  onClose,
  title = "Login Required",
  message = "Please login to continue and unlock all features.",
  redirectTo = "/dashboard/",
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleLoginClick = () => {
    onClose();
    navigate(redirectTo);
  };

  const portalRoot = typeof document !== "undefined" ? document.body : null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 h-screen flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-primary" />

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors z-10"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Body */}
            <div className="px-7 pt-8 pb-7">
              <motion.div
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center text-center gap-4"
              >
                {/* Icon */}
                <motion.div
                  variants={iconVariants}
                  className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg"
                >
                  <Lock className="w-7 h-7 text-white" />
                </motion.div>

                {/* Text */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                    {message}
                  </p>
                </motion.div>

                {/* Divider */}
                <motion.div
                  variants={itemVariants}
                  className="w-12 h-0.5 rounded-full bg-secondary"
                />

                {/* Buttons */}
                <motion.div
                  variants={itemVariants}
                  className="flex gap-3 w-full pt-1"
                >
                  <motion.button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    onClick={handleLoginClick}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover-primary transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </motion.button>
                </motion.div>

                {/* Footer hint */}
                <motion.p
                  variants={itemVariants}
                  className="text-xs text-gray-400"
                >
                  Don't have an account?{" "}
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/register/");
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up free
                  </button>
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return portalRoot ? createPortal(modalContent, portalRoot) : null;
};

export default LoginRequiredModal;
