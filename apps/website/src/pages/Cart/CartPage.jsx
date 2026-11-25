/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "../../store/useCartStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../../hooks/useCurrency";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  PackageOpen,
  LogIn,
  Truck,
  Shield,
  Tag,
  Package,
} from "lucide-react";
import Seo from "../../components/Seo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const rowV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 24 } },
  exit: { opacity: 0, x: -56, transition: { duration: 0.2 } },
};

const QtyBtn = ({ onClick, disabled, children }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    disabled={disabled}
    className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/30 hover:bg-primary/10 hover:text-primary border border-black/10 text-black/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
  >
    {children}
  </motion.button>
);

const SkeletonRow = () => (
  <div className="flex items-start gap-3 p-3 sm:p-4 rounded-2xl border border-black/8 animate-pulse">
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/8 shrink-0" />
    <div className="flex-1 min-w-0 space-y-2 pt-1">
      <div className="h-3 bg-black/8 rounded-full w-3/4" />
      <div className="h-3 bg-black/5 rounded-full w-1/3" />
    </div>
    <div className="h-6 w-14 bg-black/8 rounded shrink-0" />
  </div>
);

const EmptyCart = ({ navigate }) => (
  <motion.div
    variants={stagger}
    initial="hidden"
    animate="show"
    className="flex flex-col items-center justify-center py-20 sm:py-28 gap-5 text-center px-4"
  >
    <motion.div
      variants={fadeUp}
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-secondary/40 border border-primary/10 flex items-center justify-center"
    >
      <PackageOpen className="w-9 h-9 sm:w-10 sm:h-10 text-primary/40" />
    </motion.div>
    <motion.div variants={fadeUp} className="space-y-1.5">
      <h3 className="text-lg sm:text-xl font-heading font-bold text-primary">Your cart is empty</h3>
      <p className="text-sm text-black/40 font-body max-w-xs">
        Looks like you haven't added anything yet. Explore our collection.
      </p>
    </motion.div>
    <motion.button
      variants={fadeUp}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate("/products")}
      className="px-6 py-3 rounded-full bg-primary text-white font-body font-semibold text-sm flex items-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/85 transition-colors"
    >
      Browse Products <ArrowRight size={14} />
    </motion.button>
  </motion.div>
);

const LoginPrompt = ({ navigate }) => (
  <motion.div
    variants={stagger}
    initial="hidden"
    animate="show"
    className="flex flex-col items-center justify-center py-20 sm:py-28 gap-5 text-center px-4"
  >
    <motion.div
      variants={fadeUp}
      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gold/10 border border-gold/20 flex items-center justify-center"
    >
      <LogIn className="w-9 h-9 sm:w-10 sm:h-10 text-gold" />
    </motion.div>
    <motion.div variants={fadeUp} className="space-y-1.5">
      <h3 className="text-lg sm:text-xl font-heading font-bold text-primary">Sign in to view your cart</h3>
      <p className="text-sm text-black/40 font-body max-w-xs">
        Your cart is waiting. Login to continue shopping.
      </p>
    </motion.div>
    <motion.button
      variants={fadeUp}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate("/dashboard/")}
      className="px-6 py-3 rounded-full bg-primary text-white font-body font-semibold text-sm flex items-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/85 transition-colors"
    >
      Login / Sign Up <ArrowRight size={14} />
    </motion.button>
  </motion.div>
);

/* ── Cart item: mobile-first stacked layout ── */
const CartItem = ({ item, onIncrement, onDecrement, onRemove }) => {
  const { convert } =
    useCurrency();
  const name      = item.name      || "Product";
  const thumbnail = item.thumbnail || null;
  const price     = item.price     || 0;
  const mrp       = item.mrp       || 0;
  const total     = item.total     || price * item.quantity;
  const productId = item.product;
  const variantId = item.variantId;
  const hasDiscount = mrp > price;

  return (
    <motion.div
      layout
      variants={rowV}
      exit="exit"
      className="group flex items-start gap-3 p-3 sm:p-4 rounded-2xl border border-black/8 hover:border-primary/20 hover:shadow-sm bg-white transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-secondary/20 border border-black/8 shrink-0">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = "/Image/placeholder.png"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-primary/20" />
          </div>
        )}
      </div>

      {/* Right side — all content stacked, constrained to available width */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">

        {/* Name row + delete */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-heading font-semibold text-primary leading-snug line-clamp-2 wrap-break-word min-w-0 flex-1">
            {name}
          </p>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRemove(productId, variantId)}
            className="w-7 h-7 rounded-xl flex items-center justify-center hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
          >
            <Trash2 size={13} className="text-red-400" />
          </motion.button>
        </div>

        {/* Unit price */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-body font-semibold text-primary">
            {convert(price)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] font-body text-black/30 line-through">
              {convert(mrp)}
            </span>
          )}
          <span className="text-[10px] font-body text-black/30">/ unit</span>
        </div>

        {/* Qty controls + line total */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <QtyBtn onClick={() => onDecrement(productId, variantId)}>
              <Minus size={10} />
            </QtyBtn>
            <motion.span
              key={item.quantity}
              initial={{ scale: 1.25, color: "var(--color-primary)" }}
              animate={{ scale: 1, color: "#111827" }}
              transition={{ duration: 0.18 }}
              className="w-5 text-center text-sm font-bold font-body tabular-nums"
            >
              {item.quantity}
            </motion.span>
            <QtyBtn onClick={() => onIncrement(productId, variantId)}>
              <Plus size={10} />
            </QtyBtn>
          </div>

          <p className="text-sm font-heading font-bold text-primary shrink-0">
            {convert(total)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const CartPage = () => {
  const { convert } =
  useCurrency();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    cart,
    loading,
    getCartItems,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
  } = useCartStore();

  useEffect(() => {
    if (user) getCartItems();
  }, [user]);

  const items      = cart?.items    ?? (Array.isArray(cart) ? cart : []);
  const subtotal   = cart?.subTotal ?? items.reduce((s, i) => s + (i.total || 0), 0);
  const shipping   = cart?.shipping ?? (subtotal > 499 ? 0 : 49);
  const discount   = cart?.discount ?? 0;
  const tax        = cart?.tax ?? 0;
  const grandTotal = cart?.totalAmount ?? subtotal + shipping - discount + tax;
  const itemCount  = items.reduce((s, i) => s + i.quantity, 0);
  const isEmpty    = !loading && items.length === 0;

  return (
    <>
    <Seo page="cart"  />
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-8 sm:py-10 lg:py-12">

        {/* Page heading */}
        {user && !isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6 sm:mb-8"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <ShoppingBag size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-lg sm:text-xl font-bold text-primary">Shopping Cart</h1>
              <p className="text-xs text-black/40 font-body">
                {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
              </p>
            </div>
          </motion.div>
        )}

        {/* States */}
        {!user ? (
          <LoginPrompt navigate={navigate} />
        ) : loading && items.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : isEmpty ? (
          <EmptyCart navigate={navigate} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-5 lg:gap-6 items-start">

            {/* ── Left: items ── */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 min-w-0 w-full">

              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-black/8">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    1
                  </div>
                  <h2 className="font-heading font-bold text-primary text-sm sm:text-base">Cart Items</h2>
                  <span className="ml-auto text-xs text-black/40 font-body bg-secondary/40 px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="p-3 sm:p-4 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <CartItem
                        key={`${item.product}-${item.variantId}`}
                        item={item}
                        onIncrement={incrementQuantity}
                        onDecrement={decrementQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Free shipping nudge */}
              {/* <AnimatePresence>
                {shipping > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gold/8 border border-gold/20"
                  >
                    <Tag size={13} className="text-gold shrink-0" />
                    <p className="text-xs text-black/60 font-body">
                      Add{" "}
                      <span className="font-bold text-primary">
                       {convert(499 - subtotal)}
                      </span>{" "}
                      more for free shipping!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence> */}

              {/* Trust badges */}
              <motion.div
                variants={fadeUp}
                className="bg-primary rounded-2xl p-4 sm:p-5 text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { icon: <Truck className="w-4 h-4" />, label: "Free delivery", sub: `On orders above ${convert(499)}` },
                    { icon: <Shield className="w-4 h-4" />, label: "Secure payment", sub: "100% safe & encrypted" },
                    { icon: <Package className="w-4 h-4" />, label: "Tracked shipping", sub: "Real-time updates" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center shrink-0">
                        {f.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-heading font-semibold">{f.label}</p>
                        <p className="text-xs text-white/60 font-body">{f.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* ── Right: summary ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden lg:sticky lg:top-24">
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-black/8">
                  <h2 className="font-heading font-bold text-primary">Order Summary</h2>
                </div>

                <div className="px-4 sm:px-6 py-4 space-y-3">
                  {[
                    { label: `Subtotal (${itemCount} items)`, value: convert(subtotal) },
                    discount > 0 && { label: "Discount", value: `−${convert(discount)}`, green: true },
                    { label: `Shipping${shipping === 0 ? " (Free)" : ""}`, value: shipping === 0 ? "Free" : convert(shipping), green: shipping === 0 },
                    tax > 0 && { label: "GST", value: convert(tax) },
                  ].filter(Boolean).map(({ label, value, green }) => (
                    <div key={label} className="flex justify-between items-center gap-3 text-sm">
                      <span className="text-black/45 font-body">{label}</span>
                      <span className={`font-body font-semibold shrink-0 ${green ? "text-green-600" : "text-primary"}`}>
                        {value}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-dashed border-black/10 pt-3 flex justify-between items-baseline gap-3">
                    <span className="font-heading font-bold text-primary">Total</span>
                    <motion.span
                      key={grandTotal}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.22 }}
                      className="text-xl font-heading font-bold text-primary shrink-0"
                    >
                      {convert(grandTotal)}
                    </motion.span>
                  </div>
                </div>

                <div className="px-4 sm:px-6 pb-5 sm:pb-6 space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/checkout")}
                    className="w-full py-3.5 sm:py-4 bg-primary hover:bg-primary/85 text-white font-heading font-bold rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-colors"
                  >
                    Proceed to Checkout <ArrowRight size={15} />
                  </motion.button>

                  <button
                    onClick={() => navigate("/products")}
                    className="w-full py-2.5 rounded-2xl border border-black/10 text-black/40 hover:text-primary hover:border-primary/30 text-sm font-body font-medium transition-colors"
                  >
                    Continue Shopping
                  </button>

                  <p className="text-center text-xs text-black/30 font-body flex items-center justify-center gap-1.5 pt-1">
                    <Shield className="w-3 h-3 text-green-500 shrink-0" />
                    Secured by Razorpay · 256-bit encryption
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CartPage;