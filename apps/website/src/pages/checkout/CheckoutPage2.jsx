/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "../../hooks/useCurrency";
import {
  MapPin,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ShoppingBag,
  Truck,
  Shield,
  Tag,
  Pencil,
  Home,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Package,
  Banknote,
} from "lucide-react";
import { useCartStore } from "../../store/useCartStore";
import { usePaymentStore } from "../../store/usePaymentStore";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import { useSettingStore } from "../../store/usSettingStore";
import { AddAddressModal } from "../Profile/AddAddressModal";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

// ── Dynamically build payment methods based on codEnabled flag ────────────────
const getPaymentMethods = (codEnabled) => [
  {
    id: "razorpay",
    label: "Pay Online",
    sub: "UPI, Card, Net Banking",
    icon: <CreditCard className="w-5 h-5" />,
  },
  ...(codEnabled
    ? [
        {
          id: "cod",
          label: "Cash on Delivery",
          sub: "Pay when delivered",
          icon: <Banknote className="w-5 h-5" />,
        },
      ]
    : []),
];

function AddressCard({ address, selected, onSelect }) {
  return (
    <motion.div
      variants={scaleIn}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
        selected
          ? "border-primary bg-teal-50/50 shadow-md shadow-secondary"
          : "border-gray-200 bg-white hover:border-gold hover:shadow-sm"
      }`}
    >
      <div className="absolute top-3 right-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected ? "border-primary" : "border-gray-300"
          }`}
        >
          {selected && <div className="w-2.5 h-2.5 bg-gold rounded-full" />}
        </div>
      </div>

      {address.isDefault && (
        <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">
          Primary
        </span>
      )}

      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mb-2.5 ${
          selected ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        {address.type === "home" ? (
          <Home className="w-3 h-3" />
        ) : (
          <Briefcase className="w-3 h-3" />
        )}
        {address.type || "Home"}
      </span>

      <p className="font-bold text-primary text-sm">{address.fullName}</p>
      <p className="text-xs text-primary mt-0.5">{address.phone || "—"}</p>
      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ""},{" "}
        {address.city}, {address.state} – {address.pincode}
      </p>
    </motion.div>
  );
}

function OrderItem({ item }) {
  const { convert } = useCurrency();
  const price = item?.price || 0;
  const qty = item?.quantity || 1;
  const img = item?.thumbnail;
  const name = item?.name || "Product";

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-0"
    >
      <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-linear-to-br from-teal-50 to-amber-50 border border-gray-100">
          {img ? (
            <img src={img} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
          {qty}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2">
          {name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Unit price: {convert(price)}
        </p>
      </div>

      <p className="text-sm font-bold text-gray-900 shrink-0">
        {convert(price * qty)}
      </p>
    </motion.div>
  );
}

// ── CouponRow ─────────────────────────────────────────────────────────────────
function CouponRow({
  onApply,
  onRemove,
  appliedCoupon,
  couponLoading,
  couponError,
}) {
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!appliedCoupon) setCode("");
  }, [appliedCoupon]);

  const handleApply = () => {
    if (!code.trim()) return;
    onApply(code.trim());
  };

  const handleRemove = () => {
    setCode("");
    onRemove();
  };

  const isApplied = !!appliedCoupon;

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      <div className="flex items-center justify-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 mt-1.5 top-[45%] -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={isApplied ? appliedCoupon.code : code}
            onChange={(e) => {
              if (isApplied) return;
              setCode(e.target.value.toUpperCase());
            }}
            placeholder="Enter coupon code"
            disabled={isApplied || couponLoading}
            className="w-full pl-9 pr-4 h-12 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-70 transition-all font-mono tracking-wider"
          />
        </div>

        {isApplied ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRemove}
            className="
      h-12 px-4
      rounded-xl
      text-sm font-semibold
      bg-red-50 text-red-500
      hover:bg-red-100
      transition-all duration-300
      flex items-center justify-center gap-1.5
      whitespace-nowrap
    "
          >
            <X className="w-4 h-4" />
            Remove
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            disabled={couponLoading || !code.trim()}
            className="
              h-12 px-5
              rounded-xl
              text-sm font-semibold
              bg-primary text-white
              hover:bg-gold
              disabled:opacity-50
              transition-all duration-300
              min-w-25
              flex items-center justify-center
            "
          >
            {couponLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {isApplied && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-green-600 font-medium flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Coupon applied! You saved ₹
            {appliedCoupon.discount?.toLocaleString()}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {couponError && !isApplied && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-red-500 font-medium flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {couponError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PaymentMethodSelector — now accepts `methods` prop ────────────────────────
function PaymentMethodSelector({ selected, onChange, stepNumber, methods }) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
        <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
          {stepNumber}
        </div>
        <h2 className="font-bold text-lg text-gray-900">Payment Method</h2>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => {
          const isSelected = selected === method.id;
          return (
            <motion.div
              key={method.id}
              variants={scaleIn}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(method.id)}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-teal-50/50 shadow-md shadow-secondary"
                  : "border-gray-200 bg-white hover:border-gold hover:shadow-sm"
              }`}
            >
              <div className="absolute top-3 right-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-primary" : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 bg-gold rounded-full" />
                  )}
                </div>
              </div>

              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {method.icon}
              </div>

              <p className="font-bold text-sm text-gray-900">{method.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{method.sub}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function CheckoutPage2() {
  const { convert, currency, rates } = useCurrency();
  const [open, setOpen] = useState(false);
  const { user, addresses = [], getAddresses, addAddress } = useAuthStore();

  // ── Fetch settings to check codEnabled ──────────────────────────────────────
  const { settings, fetchSettings } = useSettingStore();
  const codEnabled = settings?.payment?.codEnabled ?? false;
  const paymentMethods = getPaymentMethods(codEnabled);
  // ────────────────────────────────────────────────────────────────────────────

  const addressLoading = false;
  const navigate = useNavigate();
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const {
    cart,
    getCartItems,
    getCartTotal,
    applyCoupon,
    removeCoupon,
    appliedCoupon,
    couponLoading,
    couponError,
  } = useCartStore();

  const { processPayment, processingPayment } = usePaymentStore();

  const hasPhysicalProduct = (cart?.items || []).some(
    (item) => item?.productType === "physical",
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/dashboard/");
      return;
    }
    getCartItems();
    fetchSettings(); // ← fetch settings on mount
    if (hasPhysicalProduct) getAddresses();
  }, []);

  // ── If COD gets disabled after being selected, reset to razorpay ─────────────
  useEffect(() => {
    if (!codEnabled && paymentMethod === "cod") {
      setPaymentMethod("razorpay");
    }
  }, [codEnabled]);
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasPhysicalProduct && addresses.length > 0 && !selectedAddressId) {
      const primary = addresses?.find((addr) => addr.isDefault);
      setSelectedAddressId(primary?._id || addresses[0]._id);
    }
  }, [addresses, hasPhysicalProduct]);

  const subtotal = getCartTotal();
  const shipping = cart?.shipping ?? 0;
  const tax = cart?.tax ?? 0;

  const couponDiscount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + shipping + tax - couponDiscount);

  const selectedAddress = (addresses || []).find(
    (a) => a._id === selectedAddressId,
  );

  const handleAddAddress = async (data) => {
    const result = await addAddress({
      fullName: data.name,
      phone: data.phone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      type: data.type?.toLowerCase() || "home",
      isDefault: false,
    });

    if (result?.success) {
      toast.success("Address added successfully");
      await getAddresses();
      setOpen(false);
    }
  };

  const handleApplyCoupon = async (code) => {
    const result = await applyCoupon(code);
    if (result?.success) {
      toast.success(
        `Coupon "${result.data.code}" applied! Saved ₹${result.data.discount}`,
      );
    } else {
      toast.error(result?.error || "Invalid coupon");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success("Coupon removed");
  };

  const handlePlaceOrder = async () => {
    if (hasPhysicalProduct && !selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    if ((cart?.items || []).length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      const result = await processPayment({
        paymentMethod,
        addressId: hasPhysicalProduct ? selectedAddressId : null,
        currency,
        currencyRate: rates?.[currency] || 1,
        code: appliedCoupon?.code || null,
        userDetails: {
          name: user?.name || selectedAddress?.fullName || "",
          email: user?.email || "",
          phone: selectedAddress?.phone || user?.phone || "",
        },
      });

      console.log("RESULT OF ORDER", result);

      if (result?.success) {
        removeCoupon();
        navigate("/thank-you", { state: { order: result.data } });
      }
    } catch (err) {
      if (err?.error && err.error !== "Payment cancelled by user") {
        toast.error(err.error || "Payment failed");
      }
    }
  };

  if (!cart || cart.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      >
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-9 h-9 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Add some products before proceeding to checkout.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/products")}
            className="px-8 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:bg-teal-800 transition-colors"
          >
            Browse Store
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {hasPhysicalProduct && (
              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                      1
                    </div>
                    <h2 className="font-bold text-lg text-gray-900">
                      Delivery Address
                    </h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-gold bg-primary hover:bg-primary cursor-pointer px-4 py-2 rounded-full transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New
                  </motion.button>
                </div>

                <div className="p-5">
                  {addressLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                  ) : addresses.length === 0 ? (
                    <motion.div
                      variants={scaleIn}
                      className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl"
                    >
                      <MapPin className="w-9 h-9 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold text-sm mb-1">
                        No addresses saved
                      </p>
                      <p className="text-gray-400 text-xs mb-4">
                        Add your delivery address to continue
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-gold hover:text-black cursor-pointer transition-colors shadow-md shadow-gold"
                      >
                        <Plus className="w-4 h-4" /> Add Address
                      </motion.button>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {addresses.map((addr) => (
                        <AddressCard
                          key={addr._id}
                          address={addr}
                          selected={selectedAddressId === addr._id}
                          onSelect={() => setSelectedAddressId(addr._id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {hasPhysicalProduct ? "2" : "1"}
                </div>
                <h2 className="font-bold text-lg text-gray-900">Order Items</h2>
                <span className="ml-auto text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
                  {cart?.items?.length || 0}{" "}
                  {(cart?.items?.length || 0) === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="px-6">
                <motion.div variants={stagger} initial="hidden" animate="show">
                  {(cart?.items || []).map((item, i) => (
                    <OrderItem key={item._id || i} item={item} />
                  ))}
                </motion.div>
              </div>
            </motion.div>

            {/* ── Payment Method — passes dynamic methods list ── */}
            <PaymentMethodSelector
              selected={paymentMethod}
              onChange={setPaymentMethod}
              stepNumber={hasPhysicalProduct ? "3" : "2"}
              methods={paymentMethods}
            />

            <motion.div
              variants={fadeUp}
              className="bg-linear-to-r from-primary via-primary to-primary/80 rounded-2xl p-5 text-white"
            >
              <div className="flex flex-wrap gap-5">
                {[
                  ...(hasPhysicalProduct
                    ? [
                        {
                          icon: <Truck className="w-4 h-4" />,
                          label: "Free delivery",
                          sub: `On orders above ${convert(499)}`,
                        },
                      ]
                    : []),
                  {
                    icon: <Shield className="w-4 h-4" />,
                    label: "Secure payment",
                    sub: "100% safe & encrypted",
                  },
                  {
                    icon: <Package className="w-4 h-4" />,
                    label: "Instant access",
                    sub: hasPhysicalProduct
                      ? "Real-time updates"
                      : "After payment",
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 flex-1 min-w-35"
                  >
                    <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.label}</p>
                      <p className="text-xs text-gold">{f.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right Column — Summary ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-lg text-gray-900">
                  Order Summary
                </h2>
              </div>

              <div className="px-6 py-4 space-y-3">
                {[
                  { label: "Subtotal", value: convert(subtotal) },
                  ...(hasPhysicalProduct
                    ? [
                        {
                          label: `Shipping${shipping === 0 ? " (Free)" : ""}`,
                          value: shipping === 0 ? "Free" : convert(shipping),
                          green: shipping === 0,
                        },
                      ]
                    : []),
                  ...(tax > 0 ? [{ label: "GST", value: convert(tax) }] : []),
                  ...(couponDiscount > 0
                    ? [
                        {
                          label: `Coupon (${appliedCoupon?.code})`,
                          value: `-${convert(couponDiscount)}`,
                          green: true,
                        },
                      ]
                    : []),
                ].map(({ label, value, green }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span
                      className={`font-semibold ${green ? "text-green-600" : "text-gray-900"}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}

                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-lg text-gray-900">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {convert(total)}
                  </span>
                </div>
              </div>

              {/* Coupon */}
              <div className="px-6 pb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Have a coupon?
                </p>
                <CouponRow
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                  appliedCoupon={appliedCoupon}
                  couponLoading={couponLoading}
                  couponError={couponError}
                />
              </div>
            </div>

            <AnimatePresence>
              {hasPhysicalProduct && selectedAddress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <MapPin className="w-4 h-4 text-teal-600" /> Delivering to
                    </div>
                    <button
                      onClick={() => setSelectedAddressId(null)}
                      className="text-xs text-teal-700 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedAddress.fullName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {selectedAddress.addressLine1}
                      {selectedAddress.addressLine2
                        ? `, ${selectedAddress.addressLine2}`
                        : ""}
                      , {selectedAddress.city}, {selectedAddress.state} –{" "}
                      {selectedAddress.pincode}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedAddress.phone || "—"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Place order */}
            <motion.button
              // whileHover={{
              //   scale:
              //     (!hasPhysicalProduct || selectedAddress) && !processingPayment
              //       ? 1.02
              //       : 1,
              //   boxShadow: "0 12px 32px rgba(15,118,110,0.3)",
              // }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrder}
              disabled={
                processingPayment ||
                (hasPhysicalProduct && !selectedAddress) ||
                (cart?.items || []).length === 0
              }
              className="w-full py-4 bg-primary hover:bg-gold text-white font-bold rounded-2xl text-base transition-colors duration-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {paymentMethod === "cod"
                    ? "Placing Order…"
                    : "Processing Payment…"}
                </>
              ) : paymentMethod === "cod" ? (
                <>
                  <Banknote className="w-5 h-5" /> Place Order ·{" "}
                  {convert(total)}
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" /> Pay {convert(total)}
                </>
              )}
            </motion.button>

            {hasPhysicalProduct && !selectedAddress && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-red-500 font-medium flex items-center justify-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Select a delivery
                address to continue
              </motion.p>
            )}

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3 text-green-500" />
              {paymentMethod === "cod"
                ? "Pay safely on delivery"
                : "Secured by Razorpay · 256-bit encryption"}
            </p>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {hasPhysicalProduct && (
          <AddAddressModal
            isOpen={open}
            onClose={() => setOpen(false)}
            onAdd={handleAddAddress}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
