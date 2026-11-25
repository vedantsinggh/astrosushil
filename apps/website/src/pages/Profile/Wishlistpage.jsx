/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Trash2, PackageOpen, Zap } from "lucide-react";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useCartStore } from "../../store/useCartStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 8;

function WishlistCard({ item, onRemove }) {
  const { addToCart } = useCartStore();
  const inCart = useCartStore((s) =>
    s.isInCart(item.product?._id || item.product),
  );
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState(false);

  const product = item.product || {};
  const productId = product._id || item.product;

  // ✅ images is array of strings (direct URLs)
  const image = product.thumbnail || product.images?.[0] || null;
  const title = product.title || product.name || "Product";

  // ✅ hasVariants products ka price variants se aata hai
  const baseVariant = product.variants?.[0] || null;
  const salePrice = product.hasVariants
    ? baseVariant?.price ?? null
    : product.price ?? product.salePrice ?? null;
  const gstType = product.gst?.type ?? "exclusive";
  const originalPrice = product.hasVariants
    ? (baseVariant?.mrp !== baseVariant?.price ? baseVariant?.mrp : null)
    : (product.mrp !== product.price ? product.mrp : null) ?? product.originalPrice ?? null;

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(productId);
  };

  const handleAddToCart = async () => {
    if (inCart) { navigate("/cart"); return; }
    setAdding(true);
    const payload = { productId, quantity: 1 };
    // Default first variant select karo agar hasVariants hai
    if (product.hasVariants && baseVariant?._id) {
      payload.variantId = baseVariant._id;
    }
    await addToCart(payload);
  
    setAdding(false);
  };

  const handleBuyNow = async () => {
    if (!inCart) {
      const payload = { productId, quantity: 1 };
      if (product.hasVariants && baseVariant?._id) {
        payload.variantId = baseVariant._id;
      }
      await addToCart(payload);
    }
    navigate("/checkout");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: removing ? 0 : 1, scale: removing ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-black/8 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-4/3  overflow-hidden bg-secondary/20 shrink-0">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(e) => { e.target.src = "/Image/placeholder.png"; }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PackageOpen size={36} className="text-primary/20" />
          </div>
        )}

        {/* Remove button */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          <Trash2 size={13} className="text-red-400" />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Sale badge */}
        {originalPrice && originalPrice !== salePrice && (
          <span className="self-start px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{ background: "var(--gradient-primary)", fontFamily: "var(--font-body)" }}>
            Sale
          </span>
        )}

        <h3
          className="font-heading text-primary text-sm leading-snug line-clamp-2 cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => navigate(`/product/${product.slug || productId}`)}
          title={title}
        >
          {title}
        </h3>

        {/* Price */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            {originalPrice && originalPrice !== salePrice && (
              <span className="text-black/35 text-xs font-body line-through">
                ₹{Number(originalPrice).toLocaleString("en-IN")}
              </span>
            )}
            {salePrice && (
              <span className="font-heading text-primary text-base">
                ₹{Number(salePrice).toLocaleString("en-IN")}
              </span>
            )}
            {!salePrice && !originalPrice && (
              <span className="text-black/30 text-xs font-body">View for price</span>
            )}
          </div>
          {salePrice && (
            <span className="text-black/35 text-[10.5px] font-body">
              {gstType === "inclusive" ? "Inclusive of GST" : "Exclusive of GST"}
            </span>
          )}
        </div>

        {/* ✅ 2 Buttons — Add to Cart + Buy Now */}
        <div className="flex gap-2 mt-auto">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding}
            className="flex-1 h-9 rounded-xl cursor-pointer bg-primary font-body text-sm font-medium flex items-center justify-center gap-1 hover:bg-gold text-white active:scale-[0.97] transition-all duration-700 disabled:opacity-60"
          >
            {/* <ShoppingCart size={11} /> */}
            {inCart ? "View Cart" : adding ? "Adding…" : "Add to Cart"}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 h-9 rounded-xl cursor-pointer bg-primary hover:bg-gold font-body text-sm font-medium text-white flex items-center justify-center gap-1 active:scale-[0.97] transition-all duration-700 disabled:opacity-60"
            // style={{ background: "var(--gradient-gold)", color: "var(--color-primary)" }}
          >
            {/* <Zap size={11} /> */}
            Buy Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-2 justify-center mt-10 flex-wrap">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="px-3 py-1 text-[12px] rounded-sm disabled:opacity-40 cursor-pointer hover:opacity-80"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-primary)",
        }}
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="w-8 h-8 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background:
              p === current ? "var(--gradient-primary)" : "transparent",
            color: p === current ? "#fff" : "var(--color-primary)",
            border: p === current ? "none" : "1px solid var(--color-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="px-3 py-1 text-[12px] rounded-sm disabled:opacity-40 cursor-pointer hover:opacity-80"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--color-primary)",
        }}
      >
        Next
      </button>
    </div>
  );
}

export default function WishlistPage() {
  const { wishlist, loading, getWishlist, toggleWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user) getWishlist();
  }, [user]);

  const totalPages = Math.ceil(wishlist.length / ITEMS_PER_PAGE);
  const paginated = wishlist.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleRemove = async (productId) => {
    await toggleWishlist({ _id: productId }, "Product");
    toast.success("Removed from wishlist");
    const remaining = wishlist.length - 1;
    const newTotalPages = Math.ceil(remaining / ITEMS_PER_PAGE);
    if (page > newTotalPages && page > 1) setPage(page - 1);
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Heart size={48} className="text-primary/20" />
        <h2 className="font-heading text-primary text-2xl">Your Wishlist</h2>
        <p className="font-body text-black/50 text-sm text-center">
          Please login to view your wishlist
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2.5 rounded-xl font-body text-sm font-semibold text-white cursor-pointer"
          style={{ background: "var(--gradient-primary)" }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen  max-w-full mx-auto">
      {loading && wishlist.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-secondary/30 animate-pulse aspect-3/4"
            />
          ))}
        </div>
      )}

      {!loading && wishlist.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 py-24"
        >
          <Heart size={56} className="text-primary/15" />
          <h3
            className="text-xl font-bold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-primary)",
            }}
          >
            Your wishlist is empty
          </h3>
          <p className="font-body text-black/40 text-sm text-center max-w-xs">
            Save products you love and come back to them anytime
          </p>
          <button
            onClick={() => navigate("/products")}
            className="px-6 py-2.5 rounded-xl font-body text-sm font-semibold text-white cursor-pointer mt-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            Explore Products
          </button>
        </motion.div>
      )}

      {wishlist.length > 0 && (
        <>
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"

            >
              {paginated.map((item) => (
                <WishlistCard
                  key={item.product?._id || item.product || item._id}
                  item={item}
                  onRemove={handleRemove}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {totalPages > 1 && (
            <Pagination current={page} total={totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
