/* eslint-disable no-unused-vars */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, LogOutIcon } from "lucide-react";
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

const LogoutConfirm = ({ isOpen, onClose, onConfirm }) => {
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
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors z-10"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Header */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center pt-4 bg-primary text-white py-2.5"
            >
              <h2 className="text-lg font-semibold">Logout</h2>
            </motion.div>

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
                  <LogOutIcon className="w-7 h-7 text-white rotate-180" />
                </motion.div>

                <h2 className="text-2xl font-bold text-primary max-w-xs">
                  Are you sure you want to logout?{" "}
                </h2>

                {/* Buttons */}
                <motion.div
                  variants={itemVariants}
                  className="flex gap-3 w-full pt-1"
                >
                  <motion.button
                    onClick={onConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium flex items-center justify-center gap-2 shadow-md hover-primary transition-colors duration-700 hover:bg-gold"
                    whileTap={{ scale: 0.97 }}
                  >
                    Yes
                  </motion.button>

                  <motion.button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:border-gold transition-colors duration-700 hover:bg-gold hover:text-white"
                    whileTap={{ scale: 0.97 }}
                  >
                    No
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return portalRoot ? createPortal(modalContent, portalRoot) : null;
};

export default LogoutConfirm;
