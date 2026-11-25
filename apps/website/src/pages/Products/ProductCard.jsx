/* eslint-disable no-unused-vars */
import { useState } from "react";
import {
  ShoppingCart,
  Zap,
  Star,
  Heart,
  Check,
  Package,
  Download,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import toast from "react-hot-toast";
import { useCurrencyStore } from "../../store/useCurrencyStore";
import { useCurrency } from "../../hooks/useCurrency";

export default function ProductCard({
  user,
  onLoginRequired,
  _id,
  image,
  badge,
  title = "Product Title",
  shortDescription = "",
  originalPrice = "",
  salePrice = "",
  gstType = "exclusive",
  type = "physical",
  rating = 0,
  reviewsCount = 0,
  onBook,
  variants = [],
  hasVariants = false,
  isInCart: initialIsInCart = false,
  isWishlisted: initialIsWishlisted = false,
 
}) {
  const { addToCart, incrementQuantity, decrementQuantity } = useCartStore();
  const { toggleWishlist } = useWishlistStore();
  const navigate = useNavigate();

  const [added, setAdded] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  const wished = useWishlistStore((s) => s.isWishlisted(_id));

  const inCart = useCartStore((s) => s.isInCart(_id));
  const qty = useCartStore((s) => s.getProductQuantity(_id));
const { convert } = useCurrency();
  const [selectedVariant, setSelectedVariant] = useState(
    hasVariants && variants.length > 0 ? variants[0] : null,
  );
const displaySalePrice = (() => {
  if (selectedVariant?.price) {
    return convert(selectedVariant.price);
  }

  if (salePrice) {
    return convert(salePrice);
  }

  return null;
})();

const displayOriginalPrice = (() => {
  if (
    selectedVariant?.mrp &&
    selectedVariant.mrp !==
      selectedVariant.price
  ) {
    return convert(selectedVariant.mrp);
  }

  if (
    originalPrice &&
    originalPrice !== salePrice
  ) {
    return convert(originalPrice);
  }

  return null;
})();
 

  const handleAddToCart = async () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    if (inCart) return;
    const payload = { productId: _id, quantity: 1 };
    if (hasVariants && selectedVariant?._id)
      payload.variantId = selectedVariant._id;
    await addToCart(payload);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleIncrement = async () => {
    const variantId =
      hasVariants && selectedVariant?._id ? selectedVariant._id : undefined;
    await incrementQuantity(_id, variantId);
  };

  const handleDecrement = async () => {
    const variantId =
      hasVariants && selectedVariant?._id ? selectedVariant._id : undefined;
    await decrementQuantity(_id, variantId);
  };

  const handleBuyNow = async () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    const payload = { productId: _id, quantity: 1 };
    if (hasVariants && selectedVariant?._id)
      payload.variantId = selectedVariant._id;
    await addToCart(payload);
    navigate("/checkout");
  };

  const handleWishlist = async () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    setWishLoading(true);
    const result = await toggleWishlist({ _id }, "Product");
    if (result === true) toast.success("Added to wishlist");
    if (result === false) toast.success("Removed from wishlist");
    setWishLoading(false);
  };

  const variantGroups =
    hasVariants && variants.length > 0
      ? variants.reduce((acc, v) => {
          if (!acc[v.name]) acc[v.name] = [];
          acc[v.name].push(v);
          return acc;
        }, {})
      : {};

  return (
    <div className="group relative flex flex-col h-full rounded-2xl overflow-hidden bg-white/8 backdrop-blur-sm border border-white/12 shadow-xl hover:shadow-2xl hover:border-gold/30 hover:bg-white/12 transition-all duration-300">
      <div className="relative overflow-hidden aspect-4/3 shrink-0 bg-black/20">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.target.src = "/Image/placeholder.png";
            }}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishLoading}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 cursor-pointer right-2.5 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center active:scale-95 transition-colors duration-700 focus-visible:outline-none border disabled:opacity-60
            ${
              wished
                ? "bg-red-500/20 border-red-400/50"
                : "bg-black/30 border-white/15"
            }`}
        >
          <Heart
            size={14}
            className={`transition-colors duration-200 ${
              wished ? "text-red-400 fill-red-400" : "text-white/60"
            }`}
          />
        </button>

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full bg-gold text-white text-xs font-body shadow">
              {badge}
            </span>
          )}
        </div>

        <span
          className={`absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-medium border
          ${
            type === "digital"
              ? "bg-primary text-white border-primary"
              : "bg-primary text-white border-primary"
          }`}
        >
          {type === "digital" ? (
            <>
              <Download size={10} /> Digital
            </>
          ) : (
            <>
              <Package size={10} /> Physical
            </>
          )}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {reviewsCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={11}
                  className={
                    i < Math.floor(rating)
                      ? "text-gold fill-gold"
                      : "text-white/15"
                  }
                />
              ))}
            </div>
            <span className="text-white/40 text-[11px] font-body">
              ({reviewsCount})
            </span>
          </div>
        )}

        <h3
          className="font-body text-white text-sm sm:text-[15px] leading-snug  cursor-pointer hover:text-gold transition-colors duration-200 line-clamp-2"
          onClick={onBook}
          title={title}
        >
          {title}
        </h3>

        {hasVariants && Object.keys(variantGroups).length > 0 && (
          <div className="flex flex-col gap-1.5">
            {Object.entries(variantGroups).map(([groupName, groupVariants]) => (
              <div key={groupName}>
                <p className="text-[10px] text-white/30 font-body mb-1.5 uppercase tracking-wide font-medium">
                  {groupName}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {groupVariants.map((v) => {
                    const isSelected = selectedVariant?._id === v._id;
                    const outOfStock = v.stock === 0;
                    return (
                      <button
                        key={v._id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => !outOfStock && setSelectedVariant(v)}
                        title={
                          outOfStock ? "Out of stock" : `${v.name}: ${v.value}`
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-body font-semibold border transition-colors duration-700 focus-visible:outline-none active:scale-95
                          ${
                            outOfStock
                              ? "border-white/8 text-white/15 bg-white/3 cursor-not-allowed line-through"
                              : isSelected
                                ? "border-gold bg-gold text-black shadow-sm scale-[1.03]"
                                : "border-white/20 text-white/60 bg-white/5 hover:border-gold/50 hover:text-white"
                          }`}
                      >
                        {v.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            {displaySalePrice && (
              <span className="font-body text-white text-base sm:text-lg font-bold">
                {displaySalePrice}
              </span>
            )}
            {displayOriginalPrice &&
              displaySalePrice &&
              displayOriginalPrice !== displaySalePrice && (
                <span className="text-white/35 text-xs font-body line-through">
                  {displayOriginalPrice}
                </span>
              )}
            {!displaySalePrice && displayOriginalPrice && (
              <span className="font-body text-white text-base sm:text-lg font-bold">
                {displayOriginalPrice}
              </span>
            )}
            {!displaySalePrice && !displayOriginalPrice && (
              <span className="text-white/30 text-xs font-body">
                Price on selection
              </span>
            )}
          </div>
          {(displaySalePrice || displayOriginalPrice) && (
            <span className="text-white/40 text-[10.5px] font-body">
              {gstType === "inclusive" ? "Inclusive of GST" : "Exclusive of GST"}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          {inCart ? (
            <motion.div
              key="qty-controls"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 h-9 flex items-center justify-between rounded-xl border  border-secondary overflow-hidden"
            >
              <button
                type="button"
                onClick={handleDecrement}
                className="h-full px-3  text-white  active:scale-90 transition-colors duration-700 focus-visible:outline-none  cursor-pointer flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Minus size={12} />
              </button>

              <AnimatePresence mode="wait">
                <motion.span
                  key={qty}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="text-white font-body text-xs font-bold min-w-5 text-center select-none"
                >
                  {qty}
                </motion.span>
              </AnimatePresence>

              <button
                type="button"
                onClick={handleIncrement}
                className="h-full px-3 cursor-pointer  text-white active:scale-90 transition-colors duration-700 focus-visible:outline-none flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <Plus size={12} />
              </button>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 px-5 py-2 cursor-pointer rounded-md border border-gold text-white font-body text-base font-normal flex items-center justify-center gap-1.5 hover:bg-gold/85 active:scale-[0.97] transition-colors duration-700 focus-visible:outline-none"
            >
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1"
                  >
                    <Check size={12} /> Added
                  </motion.span>
                ) : (
                  <motion.span key="cart" className="flex items-center gap-1">
                    {/* <ShoppingCart size={12} /> */}
                     Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          {/* Buy Now */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 px-5 py-2 cursor-pointer rounded-md border border-gold text-white font-body text-base font-normal flex items-center justify-center gap-1.5 hover:bg-gold/85 active:scale-[0.97] transition-colors duration-700 focus-visible:outline-none"
          >
            {/* <Zap size={12} />  */}
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
