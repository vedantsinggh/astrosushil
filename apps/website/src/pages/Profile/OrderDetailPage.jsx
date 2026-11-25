/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Package,
  Calendar,
  Truck,
  CreditCard,
  MapPin,
  Phone,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingBag,
  Mic,
  MessageCircle,
  Video,
  Star,
  ChevronRight,
  Tag,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { usePaymentStore } from "../../store/usePaymentStore";
import toast from "react-hot-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

// ✅ Status steps uppercase — matched with orderStatus from response
const STATUS_STEPS = ["ORDERED", "CONFIRMED", "SHIPPED", "DELIVERED"];

const CONSULTATION_TYPE_LABEL = {
  CHAT: {
    label: "Chat Consultation",
    icon: <MessageCircle className="w-4 h-4" />,
    color: "from-blue-500 to-cyan-500",
  },
  VIDEO: {
    label: "Video Consultation",
    icon: <Video className="w-4 h-4" />,
    color: "from-purple-500 to-pink-500",
  },
  VOICE: {
    label: "Voice Consultation",
    icon: <Mic className="w-4 h-4" />,
    color: "from-teal-500 to-emerald-500",
  },
  CALL: {
    label: "Call Consultation",
    icon: <Mic className="w-4 h-4" />,
    color: "from-teal-500 to-emerald-500",
  },
};

const statusConfig = (status) => {
  if (["COMPLETED", "DELIVERED", "PAID"].includes(status))
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
      label: status,
    };
  if (["PENDING", "ORDERED", "SHIPPED", "CONFIRMED"].includes(status))
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      label: status,
    };
  if (["FAILED", "CANCELLED"].includes(status))
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      dot: "bg-red-500",
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      label: status,
    };
  return {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-400",
    icon: <Package className="w-4 h-4 text-gray-500" />,
    label: status,
  };
};

export default function OrderDetail() {
  const [downloadingId, setDownloadingId] = useState(null);
  const { orderId } = useParams();
  const navigate = useNavigate();

  const {
    order,
    loading,
    error,
    getOrderDetails,
    clearOrder,
    downloadInvoice,
  } = usePaymentStore();

  useEffect(() => {
    if (orderId) {
      clearOrder();
      getOrderDetails(orderId);
    }
  }, [orderId]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ FIX: response mein orderStatus & payment.status use karo
  const getOrderStatus = () => {
    if (!order) return "PENDING";
    if (["physical", "PRODUCT"].includes(order.orderType)) {
      return (order.orderStatus || "PENDING").toUpperCase();
    }
    return (
      order.payment?.status ||
      order.paymentStatus ||
      "PENDING"
    ).toUpperCase();
  };

  const handleDownloadInvoice = async (id, e) => {
    e.stopPropagation();
    try {
      setDownloadingId(id);
      const result = await downloadInvoice(id);
      if (result?.error) toast.error(result.error);
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-[3px] border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-medium tracking-wide">
            Loading order details...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!loading && !order) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-4"
        >
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-gray-800 text-lg font-bold mb-1">
            Order Not Found
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {error || "We couldn't load this order."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-gold cursor-pointer transition-all"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const isProductOrder = !!order?.items?.length;

  const currentStatus = getOrderStatus();
  const config = statusConfig(currentStatus);

  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus);

  const consultationType =
    CONSULTATION_TYPE_LABEL[order?.orderType?.toUpperCase()] ||
    CONSULTATION_TYPE_LABEL.VOICE;

  // ✅ FIX: order.items use karo, order.products nahi
  const subtotal =
    order?.items?.reduce((t, i) => t + i.price * i.quantity, 0) || 0;

  // ✅ FIX: totalAmount use karo
  const totalAmount = order?.totalAmount ?? order?.amount ?? 0;

  // ✅ FIX: payment.method use karo
  const paymentMethod =
    order?.payment?.method?.toUpperCase() || order?.paymentMethod || "—";

  return (
    <div className="min-h-screen w-full bg-[#f8f9fc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto px-5">
        {/* ── Header ── */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Order Details
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                #{order._id?.slice(-10).toUpperCase()} · Placed{" "}
                {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div
              className={`ml-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${config.bg} ${config.border}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}
              />
              {config.icon}
              <span
                className={`text-xs font-bold uppercase tracking-wide ${config.text}`}
              >
                {config.label}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
          {/* ═══ LEFT COLUMN ═══ */}
          <div className="space-y-5">
            {/* ✅ FIX: order.items check karo */}
            {isProductOrder && order.items?.length > 0 && (
              <motion.div
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Items Ordered
                  </h2>

                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="divide-y divide-gray-50">
                  {order.items.map((item, idx) => {
                    const product = item.product;
                    return (
                      <motion.div
                        key={item._id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.25 + idx * 0.06,
                          duration: 0.35,
                        }}
                        className="flex gap-4 p-5 hover:bg-gray-50/60 transition-colors"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={
                              item.image ||
                              product?.thumbnail ||
                              product?.images?.[0] ||
                              "https://via.placeholder.com/100"
                            }
                            alt={item.name || product?.name || "Product"}
                            className="w-20 h-20 object-cover rounded-xl border border-gray-100"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/100";
                            }}
                          />
                          {item.quantity > 1 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                              {item.quantity}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">
                            {item.name || product?.name || "Product"}
                          </h4>
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                            {product?.shortDescription ||
                              "No description available"}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                              Qty: {item.quantity}
                            </span>
                            <span className="text-xs text-gray-400">
                              ₹{item.price?.toFixed(2)} each
                            </span>
                            {item.mrp && item.mrp > item.price && (
                              <span className="text-xs text-gray-300 line-through">
                                ₹{item.mrp?.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-base font-bold text-gray-900">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 space-y-2.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-700">
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Discount
                      </span>
                      <span className="font-semibold">
                        − ₹{order.discount?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.shippingCharge > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Shipping
                      </span>
                      <span className="font-medium text-gray-700">
                        ₹{order.shippingCharge?.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2.5 border-t border-gray-200">
                    <span>Total Paid</span>
                    <span className="text-primary text-lg">
                      ₹{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Delivery Progress */}
            {isProductOrder && currentStepIndex !== -1 && (
              <motion.div
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">
                  Delivery Progress
                </h2>
                <div className="relative flex items-start justify-between">
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 z-0" />
                  <motion.div
                    className="absolute top-4 left-0 h-0.5 bg-primary z-0"
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                    }}
                    transition={{
                      duration: 1,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.4,
                    }}
                  />
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <motion.div
                        key={step}
                        className="relative z-10 flex flex-col items-center gap-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1, duration: 0.4 }}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                          ${isDone ? "bg-primary border-gold shadow-md shadow-primary" : "bg-white border-gray-200"}
                          ${isCurrent ? "ring-4 ring-primary" : ""}
                        `}
                        >
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-xs font-semibold ${isDone ? "text-primary" : "text-gray-400"}`}
                          >
                            {step.charAt(0) + step.slice(1).toLowerCase()}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Astrologer Card (Consultation Orders) */}
            {!isProductOrder && order.astrologerId && (
              <motion.div
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Astrologer
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={
                          order.astrologerId.picture?.url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(order.astrologerId.name || "A")}&background=0d9488&color=fff&size=128`
                        }
                        alt={order.astrologerId.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-100"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(order.astrologerId.name || "A")}&background=0d9488&color=fff&size=128`;
                        }}
                      />
                      {order.astrologerId.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900">
                        {order.astrologerId.name}
                      </p>
                      {order.astrologerId.specialization && (
                        <p className="text-sm text-gray-400 mt-0.5">
                          {order.astrologerId.specialization}
                        </p>
                      )}
                      <div
                        className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-linear-to-r ${consultationType.color} text-white text-xs font-semibold`}
                      >
                        {consultationType.icon}
                        {consultationType.label}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {order.duration && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Duration</p>
                        <p className="text-sm font-bold text-gray-900">
                          {order.duration} Min
                        </p>
                      </div>
                    )}
                    {order.newUserDiscount > 0 && (
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-xs text-emerald-600 mb-1">
                          New User Discount
                        </p>
                        <p className="text-sm font-bold text-emerald-700">
                          − ₹{order.newUserDiscount?.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {order.loyalUserDiscount > 0 && (
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-xs text-emerald-600 mb-1">
                          Loyal User Discount
                        </p>
                        <p className="text-sm font-bold text-emerald-700">
                          − ₹{order.loyalUserDiscount?.toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div className="bg-teal-50 rounded-xl p-3">
                      <p className="text-xs text-teal-600 mb-1">Amount Paid</p>
                      <p className="text-sm font-bold text-teal-700">
                        ₹{totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div className="space-y-5">
            {/* Order Summary Card */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Order Summary
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {[
                  {
                    icon: <Calendar className="w-4 h-4 text-teal-600" />,
                    label: "Order Date",
                    value: formatDate(order.createdAt),
                    bg: "bg-teal-50",
                  },
                  isProductOrder && {
                    icon: <Truck className="w-4 h-4 text-blue-600" />,
                    label: "Delivery Date",
                    // ✅ deliveryDate response mein nahi hai, so fallback
                    value: order.deliveryDate
                      ? formatDate(order.deliveryDate)
                      : "To be updated",
                    bg: "bg-blue-50",
                  },
                  !isProductOrder &&
                    order.duration && {
                      icon: <Clock className="w-4 h-4 text-violet-600" />,
                      label: "Duration",
                      value: `${order.duration} Min`,
                      bg: "bg-violet-50",
                    },
                  {
                    icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
                    label: "Payment Method",
                    // ✅ FIX: order.payment.method
                    value: paymentMethod,
                    bg: "bg-emerald-50",
                  },
                  {
                    icon: <Package className="w-4 h-4 text-violet-500" />,
                    label: "Order Status",
                    // ✅ FIX: order.orderStatus
                    value: currentStatus,
                    bg: "bg-violet-50",
                  },
                  {
                    icon: <ShoppingBag className="w-4 h-4 text-orange-500" />,
                    label: "Total Amount",
                    // ✅ FIX: totalAmount
                    value: `₹${totalAmount.toFixed(2)}`,
                    bg: "bg-orange-50",
                    bold: true,
                  },
                ]
                  .filter(Boolean)
                  .map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p
                          className={`text-sm truncate ${item.bold ? "font-bold text-teal-700" : "font-semibold text-gray-900"}`}
                        >
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>

            {/* Shipping Address */}
            {isProductOrder && order.shippingAddress && (
              <motion.div
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Shipping Address
                  </h2>
                </div>
                <div className="p-6">
                  {/* ✅ FIX: fullName use karo */}
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    {order.shippingAddress.fullName ||
                      order.shippingAddress.name ||
                      "—"}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 &&
                      `, ${order.shippingAddress.addressLine2}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    — {order.shippingAddress.pincode}
                  </p>
                  {order.shippingAddress.phone && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {order.shippingAddress.phone}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => handleDownloadInvoice(order._id, e)}
                disabled={downloadingId === order._id}
                className="w-full px-5 py-3.5 bg-primary text-white rounded-xl hover:bg-gold cursor-pointer transition-all duration-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-teal-100"
              >
                {downloadingId === order._id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Invoice
                  </>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => navigate(-1)}
                className="w-full px-5 py-3.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Orders
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
