/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Generic mobile bottom sheet — slides up from the bottom with a backdrop,
// closes on backdrop click or the X button. Content scrolls internally so
// a long filter list doesn't push the header/footer off-screen.
export default function BottomSheet({ isOpen, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <div className="w-10 h-1 rounded-full bg-black/15 mx-auto mt-2.5" aria-hidden="true" />

            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/8 shrink-0">
              <h3 className="font-heading text-primary text-base">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/40 hover:bg-black/5 hover:text-primary transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>

            {footer && (
              <div className="px-5 py-3.5 border-t border-black/8 shrink-0">{footer}</div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
