/* eslint-disable no-unused-vars */

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function SuccessModal({ booking, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 size={32} className="text-green-500" />
        </motion.div>

        <h3 className="font-heading font-bold text-primary text-xl mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-sm font-body text-black/50 mb-1">
          {booking?.date?.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          at {booking?.slot?.startTime}
        </p>
        <p className="text-xs font-body text-black/35 mb-6">
          A confirmation has been sent to your phone.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-primary text-white font-body font-bold text-sm hover:bg-primary/85 transition-colors"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
}