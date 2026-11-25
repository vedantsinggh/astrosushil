import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  MapPin,
  CreditCard,
  Banknote,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Home,
  Copy,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import Confetti from "../utils/animate";

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-teal-700" : "text-gray-800"}`}
      >
        {value}
      </span>
    </div>
  );
}

function OrderItemRow({ item }) {
  const price = item?.price || 0;
  const qty = item?.quantity || 1;
  const img = item?.image || item?.thumbnail;
  const name = item?.name || "Product";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-teal-50 border border-gray-100 shrink-0">
        {img ? (
          <img src={img} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 line-clamp-1">
          {name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Qty: {qty}</p>
      </div>
      <p className="text-sm font-bold text-gray-800 shrink-0">
        ₹{(price * qty).toLocaleString()}
      </p>
    </div>
  );
}

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const order = state?.order.order || null;

  const orderId = order?._id ? order._id.toString() : "—";
  const shortId = orderId !== "—" ? orderId.slice(-8).toUpperCase() : "—";

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast.success("Order ID copied!");
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f5f7f6] flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Placed!
          </h1>
          <p className="text-gray-500 text-lg mb-6">
            Your order has been placed successfully.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="px-6 py-3 bg-primary text-sm text-white rounded-full font-medium hover:bg-gold transition-colors duration-700 cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-[#f5f7f6]">
      <Confetti />

      {/* ── Hero ── */}
      <div className="bg-primary relative overflow-hidden py-20">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center relative z-10">
          {/* animated checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 18,
              delay: 0.1,
            }}
            className="w-24 h-24 rounded-full bg-white/10 border-4 border-gold flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-12 h-12 text-gold" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.25,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-3xl sm:text-4xl font-extrabold text-white mb-2"
          >
            Order Confirmed! 🎉
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.35,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-teal-100 text-sm sm:text-base mb-6"
          >
            Thank you for your order. We'll get it to you soon!
          </motion.p>

          {/* Order ID pill */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            onClick={copyOrderId}
            className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-full px-5 py-2.5 transition-colors"
          >
            <span className="text-xs text-teal-100 font-medium">Order ID</span>
            <span className="text-sm font-bold text-white tracking-wider">
              #{shortId}
            </span>
            <Copy className="w-3.5 h-3.5 text-gold" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
