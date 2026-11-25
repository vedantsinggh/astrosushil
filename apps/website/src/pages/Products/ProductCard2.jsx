/* eslint-disable no-unused-vars */
import { useState, useMemo } from "react";
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
import { useCurrency } from "../../hooks/useCurrency";
import { isVariantOutOfStock } from "../../utils/stock";

export default function ProductCard2({
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
  soldByRatti = false,
  stock = 0,
  sku,
}) {
  const { addToCart, incrementQuantity, decrementQuantity } = useCartStore();
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const navigate = useNavigate();
  const { convert } = useCurrency();
  const safeVariants = useMemo(
    () =>
      Array.isArray(variants)
        ? variants.filter((variant) => variant && typeof variant === "object")
        : [],
    [variants],
  );
  const [selectedVariant, setSelectedVariant] = useState(
    hasVariants && safeVariants.length > 0 ? safeVariants[0] : null,
  );
  const selectedVariantId = hasVariants ? selectedVariant?._id : undefined;
  const inCart = useCartStore((s) => s.isInCart(_id, selectedVariantId));
  const qty = useCartStore((s) => s.getProductQuantity(_id, selectedVariantId));

  const wished = useWishlistStore((s) => s.isWishlisted(_id));

  const [wishLoading, setWishLoading] = useState(false);
  const [added, setAdded] = useState(false);

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
    if (selectedVariant?.mrp && selectedVariant.mrp !== selectedVariant.price) {
      return convert(selectedVariant.mrp);
    }

    if (originalPrice && originalPrice !== salePrice) {
      return convert(originalPrice);
    }

    return null;
  })();

  // A variant with sub-variants isn't directly purchasable — there's no
  // second picker level on a listing card, so send the customer to the PDP
  // to finish drilling down instead of firing an incomplete variantId-only
  // add-to-cart. A gemstone (soldByRatti) has no card-level picker at all —
  // it always needs the PDP's ratti selector.
  const needsSubVariant =
    (hasVariants && selectedVariant?.subVariants?.length > 0) || soldByRatti;

  // Digital/service products aren't inventory-tracked — `stock` defaults to
  // 0 for every type, so gating on it here would show every digital product
  // as permanently out of stock.
  const isOutOfStock =
    type !== "physical"
      ? false
      : hasVariants
        ? selectedVariant
          ? isVariantOutOfStock(selectedVariant)
          : false
        : stock <= 0;

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    if (needsSubVariant) {
      toast("Select options to continue");
      onBook?.();
      return;
    }
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
    if (isOutOfStock) return;
    if (needsSubVariant) {
      toast("Select options to continue");
      onBook?.();
      return;
    }
    if (!user) {
      onLoginRequired?.();
      return;
    }
    if (!inCart) {
      const payload = { productId: _id, quantity: 1 };
      if (hasVariants && selectedVariant?._id)
        payload.variantId = selectedVariant._id;
      await addToCart(payload);
    }
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

  const variantGroups = useMemo(() => {
    if (!hasVariants || safeVariants.length === 0) return {};
    return safeVariants.reduce((acc, variant) => {
      const groupName = variant.name || "Options";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(variant);
      return acc;
    }, {});
  }, [hasVariants, safeVariants]);

  return (
    <div
      onClick={onBook}
      className="group relative cursor-pointer flex flex-col h-full rounded-2xl overflow-hidden bg-white border border-black/8 shadow-sm hover:shadow-lg hover:shadow-primary/8 hover:border-primary/20 transition-all duration-300"
    >
      {/* ── Image ── */}
      <div className="relative overflow-hidden bg-white aspect-4/3 shrink-0">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.target.src = "/Image/placeholder.png";
            }}
            className="w-full h-full object-cover transition-transform duration-500 rounded-br-[5rem]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-primary/20" />
          </div>
        )}

        {/* ── Wishlist heart — store se sync ── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleWishlist();
          }}
          disabled={wishLoading}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-sm shadow flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 focus-visible:outline-none disabled:opacity-60
            ${wished ? "bg-red-50 border border-red-200" : "bg-white/90"}`}
        >
          <Heart
            size={15}
            className={wished ? "text-red-500 fill-red-500" : "text-black/35"}
          />
        </button>

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full bg-linear-to-r from-gold to-yellow-500 text-black text-[10px] font-body font-medium shadow-sm">
              {badge}
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-body font-medium shadow-sm">
              Out of Stock
            </span>
          )}
        </div>

        <span
          className={`absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium
          ${type === "digital" ? "bg-primary text-white" : "bg-primary text-white"}`}
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

      <div className="flex flex-col flex-1 p-4 gap-3">
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
                      : "text-black/15"
                  }
                />
              ))}
            </div>
            <span className="text-black/40 text-[11px] font-body">
              ({reviewsCount})
            </span>
          </div>
        )}

        <h3
          className="font-body hover:underline text-primary text-sm sm:text-[15px] leading-snug line-clamp-2 cursor-pointer transition-opacity"
          title={title}
        >
          {title}
        </h3>

        {sku && (
          <p className="text-black/35 text-[10.5px] font-body -mt-2">SKU: {sku}</p>
        )}

        {hasVariants && Object.keys(variantGroups).length > 0 && (
          <div className="flex flex-col gap-2">
            {Object.entries(variantGroups).map(([groupName, groupVariants]) => (
              <div key={groupName}>
                <p className="text-[10px] text-black/35 font-body mb-1.5 uppercase tracking-wide font-medium">
                  {groupName}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {groupVariants.map((v) => {
                    const isSelected = selectedVariant?._id === v._id;
                    const outOfStock = isVariantOutOfStock(v);
                    return (
                      <button
                        key={v._id}
                        type="button"
                        disabled={outOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!outOfStock) setSelectedVariant(v);
                        }}
                        className={`relative px-2.5 py-1 rounded-lg text-[11px] font-body font-semibold border transition-all duration-700 focus-visible:outline-none active:scale-95
                          ${
                            outOfStock
                              ? "border-black/8 text-black/20 bg-black/3 cursor-not-allowed line-through"
                              : isSelected
                                ? "border-primary bg-primary text-white shadow-sm shadow-primary/25 scale-[1.03]"
                                : "border-black/12 text-black/55 bg-white hover:bg-gold hover:text-white"
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
            {displayOriginalPrice &&
              displaySalePrice &&
              displayOriginalPrice !== displaySalePrice && (
                <span className="text-black/50 text-sm font-body line-through">
                  {displayOriginalPrice}
                </span>
              )}
            {displaySalePrice && (
              <span className="font-body text-primary font-semibold text-base sm:text-lg">
                {displaySalePrice}
              </span>
            )}
            {!displaySalePrice && displayOriginalPrice && (
              <span className="font-body text-primary text-base sm:text-lg">
                {displayOriginalPrice}
              </span>
            )}
            {!displaySalePrice && !displayOriginalPrice && (
              <span className="text-black/30 text-xs font-body">
                Price on selection
              </span>
            )}
            {soldByRatti && (displaySalePrice || displayOriginalPrice) && (
              <span className="text-black/45 text-[11px] font-body">/ ratti</span>
            )}
          </div>
          {(displaySalePrice || displayOriginalPrice) && (
            <span className="text-black/35 text-[10.5px] font-body">
              {gstType === "inclusive"
                ? "Inclusive of GST"
                : "Exclusive of GST"}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          {isOutOfStock && !inCart ? (
            <button
              type="button"
              disabled
              className="flex-1 py-3 rounded-md border border-black/10 bg-black/5 text-black/35 font-body text-sm font-medium flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              Out of Stock
            </button>
          ) : inCart ? (
            <motion.div
              key="qty-controls"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 py-px flex items-center justify-between rounded-full bg-secondary border-2 border-primary overflow-hidden"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecrement();
                }}
                className="h-8 w-8 cursor-pointer text-white hover:bg-gold active:scale-90 transition-all duration-700 focus-visible:outline-none flex items-center justify-center bg-primary rounded-full ml-1"
                aria-label="Decrease quantity"
              >
                <Minus size={18} />
              </button>

              <AnimatePresence mode="wait">
                <motion.span
                  key={qty}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="text-primary font-body text-sm font-bold min-w-5 text-center select-none"
                >
                  {qty}
                </motion.span>
              </AnimatePresence>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIncrement();
                }}
                className="h-8 w-8 cursor-pointer text-white hover:bg-gold active:scale-90 transition-all duration-700 focus-visible:outline-none flex items-center justify-center bg-primary rounded-full mr-1"
                aria-label="Increase quantity"
              >
                <Plus size={18} />
              </button>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart();
              }}
              className="flex-1 py-px rounded-md cursor-pointer bg-primary text-white font-body text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gold hover:text-white active:scale-[0.97] transition-all duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                    {/* <ShoppingCart size={12} />  */}
                    Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          {!(isOutOfStock && !inCart) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBuyNow();
              }}
              disabled={isOutOfStock}
              className="flex-1 py-3 rounded-md cursor-pointer bg-primary hover:bg-gold text-white font-body text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all duration-700 shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:shadow-none"
            >
              {/* <Zap size={12} /> */}
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
