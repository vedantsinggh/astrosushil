/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Zap,
  Package,
  Download,
  Shield,
  RotateCcw,
  Truck,
  Check,
  Plus,
  Minus,
  Tag,
} from "lucide-react";
import PageHero from "../../components/HeroPage";
import { useProductStore } from "../../store/useProductStore";
import Seo from "../../components/Seo";
import { useCartStore } from "../../store/useCartStore";
import { useCurrency } from "../../hooks/useCurrency";
import { useSearchParams } from "react-router-dom";

const fmt = (n, cur = "₹") => `${cur}${Number(n).toLocaleString("en-IN")}`;

function StarRow({ rating, size = 14 }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.floor(rating) ? "text-gold" : "text-black/20"}
          fill={i < Math.floor(rating) ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function Gallery({ images, wished, onWishToggle }) {
  const [active, setActive] = useState(0);
  const imageCount = images.length;

  const goToImage = (direction) => {
    if (imageCount <= 1) return;

    setActive((current) =>
      (current + direction + imageCount) % imageCount,
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-2 sm:mx-3">
        <div className="relative overflow-hidden rounded-xl bg-secondary/10">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={images[active]}
              alt="Product image"
              className="block w-full h-auto object-contain rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          <button
            type="button"
            onClick={onWishToggle}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/95 text-primary shadow-sm ring-1 ring-black/10 backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Heart
              size={17}
              className={wished ? "text-red-500 fill-red-500" : "text-black/40"}
              aria-hidden="true"
            />
          </button>
        </div>
        {imageCount > 1 && (
          <>
            <button
              type="button"
              onClick={() => goToImage(-1)}
              aria-label="Previous product image"
              className="absolute -left-2 sm:-left-3 top-1/2 z-10 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 text-primary shadow-sm ring-1 ring-black/10 backdrop-blur-sm flex items-center justify-center transition hover:bg-white hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goToImage(1)}
              aria-label="Next product image"
              className="absolute -right-2 sm:-right-3 top-1/2 z-10 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 text-primary shadow-sm ring-1 ring-black/10 backdrop-blur-sm flex items-center justify-center transition hover:bg-white hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            className={`w-16 h-16 rounded-xl overflow-hidden bg-secondary/10 p-1 transition-all duration-300
              ${i === active ? " ring-2 ring-primary/30" : "opacity-55 hover:opacity-85"}`}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-contain rounded-lg"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function TrustBadge({ icon: Icon, label, sub }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 p-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon size={18} className="text-primary" aria-hidden="true" />
      </div>
      <span className="font-body text-black text-xs font-medium leading-tight">
        {label}
      </span>
      {sub && (
        <span className="text-black/40 text-[10px] font-body">{sub}</span>
      )}
    </div>
  );
}

function normalizeVariants(apiVariants = []) {
  if (!apiVariants.length) return [];

  const basePrice = apiVariants[0]?.price ?? 0;

  return apiVariants.map((v) => ({
    label: `${v.name}: ${v.value}`,

    option: v.name.toLowerCase(),
    optionValue: String(v.value).toLowerCase(),

    value: v._id,
    price: v.price,
    mrp: v.mrp,
    stock: v.stock,
    priceAdd: v.price - basePrice,
  }));
}

export default function ProductDetailPage() {
  const { convert } = useCurrency();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    addToCart,
    incrementQuantity,
    decrementQuantity,
    isInCart,
    getProductQuantity,
  } = useCartStore();

  const {
    product: raw,
    loading,
    error,
    getProductBySlug,
    clearProduct,
  } = useProductStore();

  useEffect(() => {
    if (slug) getProductBySlug(slug);

    return () => clearProduct();
  }, [slug]);

  const p = raw
    ? {
        id: raw._id,
        type: raw.type,
        badge: raw.isBestSeller
          ? "Best Seller"
          : raw.isTrending
            ? "Trending"
            : null,
        sku: raw.sku,
        images: raw.images?.length
          ? raw.images
          : [raw.thumbnail].filter(Boolean),
        title: raw.name,
        shortDescription: raw.shortDescription,
        rating: raw.rating ?? 0,
        reviewCount: raw.reviewsCount ?? 0,
        originalPrice: raw.variants?.[0]?.mrp ?? raw.mrp ?? raw.price ?? 0,
        salePrice: raw.variants?.[0]?.price ?? raw.price ?? 0,
        gstType: raw.gst?.type ?? "exclusive",

        stock: raw.stock ?? 0,
        variants: normalizeVariants(raw.variants),
        highlights: [],
        descriptionHtml: raw.description ?? "",
        reviews: [],
        shipping: {
          freeAbove: 999,
          estimatedDays: "5–7 business days",
          returnDays: 7,
        },
      }
    : null;

  // Variant from URL
  const variantParam = p?.variants?.[0]
    ? searchParams.get(p.variants[0].option)
    : null;

  // Set default variant when product loads
  useEffect(() => {
    if (!p?.variants?.length) return;

    const firstVariant = p.variants[0];

    if (!searchParams.get(firstVariant.option)) {
      setSearchParams(
        {
          [firstVariant.option]: firstVariant.optionValue,
        },
        { replace: true },
      );
    }
  }, [p]);

  // Selected variant
  const selectedVariant = useMemo(() => {
    if (!p?.variants?.length) return null;

    return (
      p.variants.find((v) => searchParams.get(v.option) === v.optionValue) ||
      p.variants[0]
    );
  }, [p, searchParams]);

  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [addedCart, setAddedCart] = useState(false);
  const inCart = isInCart(p?._id || p?.id);
  const cartQty = getProductQuantity(p?._id || p?.id);

  const effectivePrice = selectedVariant
    ? selectedVariant.price
    : (p?.salePrice ?? 0);
  const effectiveOriginal = selectedVariant
    ? selectedVariant.mrp
    : (p?.originalPrice ?? 0);
  const discount =
    effectiveOriginal > effectivePrice
      ? Math.round(100 - (effectivePrice / effectiveOriginal) * 100)
      : 0;

  const activeStock = selectedVariant ? selectedVariant.stock : (p?.stock ?? 0);
  const isPhysical = p?.type === "physical";
  const isDigital = p?.type === "digital";

  const handleAddCart = async () => {
    const payload = {
      productId: p.id,
      quantity: qty,
    };

    if (selectedVariant?.value) {
      payload.variantId = selectedVariant.value;
    }

    await addToCart(payload);

    setAddedCart(true);

    setTimeout(() => {
      setAddedCart(false);
    }, 2000);
  };
  const handleBuyNow = async () => {
    const payload = {
      productId: p.id,
      quantity: qty,
    };

    if (selectedVariant?.value) {
      payload.variantId = selectedVariant.value;
    }

    if (!inCart) {
      await addToCart(payload);
    }

    navigate("/checkout");
  };

  const seo = useMemo(() => {
    return {
      title: selectedVariant?.metaTitle || raw?.metaTitle || raw?.name || "",

      description:
        selectedVariant?.metaDescription ||
        raw?.metaDescription ||
        raw?.shortDescription ||
        "",

      keywords: raw?.keywords?.join(", ") || "",
      image: raw?.thumbnail || "",
    };
  }, [selectedVariant, raw]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="font-heading text-black text-xl">Product not found</p>
        <p className="text-black/50 text-sm font-body">
          {error ?? "This product could not be loaded."}
        </p>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        image={seo.image}
      />
      <PageHero
        title="Huge Range of Featured Products"
        highlight="Featured Products"
        subtitle="The extraordinary world of astrology, an ancient science that illuminates personality, purpose, and possibility. Every moment holds cosmic meaning"
        image="/Image/page-hero-bg.webp"
        breadcrumbs={[
          { label: "Products", href: "/products" },
          { label: p.title.slice(0, 25) + "...", href: `/product/${slug}` },
        ]}
      />

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-20">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Gallery
                images={p.images}
                wished={wished}
                onWishToggle={() => setWished((w) => !w)}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {p.badge && (
                  <span className="px-3 py-1 rounded-full bg-gradient-gold text-black text-xs font-body font-medium">
                    {p.badge}
                  </span>
                )}

                <button
                  type="button"
                  className={`relative cursor-pointer flex items-center gap-2 px-8 sm:px-10 py-2.5 rounded-xl font-heading font-semibold text-sm sm:text-lg transition-all duration-700
                    focus-visible:outline-none bg-gold text-white`}
                >
                  <img
                    src="/Image/mission-icon.png"
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                    className="absolute top-2 left-2 -translate-x-1/2 w-8 h-8 object-contain z-5"
                  />
                  {isDigital ? "Digital Product" : "Physical Product"}
                </button>

                {/* <span
                  className={`px-3 py-1 rounded-full text-xs font-body font-medium flex items-center gap-1
                  ${isDigital ? "bg-primary/10 text-primary" : "bg-green-50 text-green-700"}`}
                >
                  {isDigital ? (
                    <Download size={11} aria-hidden="true" />
                  ) : (
                    <Package size={11} aria-hidden="true" />
                  )}
                  {isDigital ? "Digital Product" : "Physical Product"}
                </span> */}
                {/* <span className="text-black/35 text-xs font-body">
                  SKU: {p.sku}
                </span> */}
              </div>

              <h1 className="font-heading text-primary text-2xl sm:text-3xl lg:text-[1.85rem] xl:text-3xl leading-snug">
                {p.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 flex-wrap">
                <StarRow rating={p.rating} size={16} />
                <span className="text-gold font-heading text-sm">
                  {p.rating}
                </span>
                <span className="text-black/40 text-sm font-body">
                  ({p.reviewCount} reviews)
                </span>
              </div>

              {/* Short description */}
              <p className="text-black/60 text-sm sm:text-base font-body leading-relaxed border-b border-black/8 pb-5 whitespace-pre-wrap">
                {p.shortDescription}
              </p>

              {/* Price */}
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  {effectiveOriginal > effectivePrice && (
                    <>
                      <span className="text-black/35 text-xl font-body line-through">
                        {convert(effectiveOriginal)}
                      </span>
                    </>
                  )}

                  <span className="font-body text-primary font-semibold text-3xl">
                    {convert(effectivePrice)}
                  </span>
                  {/* <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-body font-medium flex items-center gap-1">
                    <Tag size={11} aria-hidden="true" /> {discount}% OFF
                  </span> */}
                </div>
                <span className="text-black/35 text-xs font-body">
                  {p.gstType === "inclusive"
                    ? "Inclusive of GST"
                    : "Exclusive of GST"}
                </span>
              </div>

              {/* Low stock */}
              {isPhysical && activeStock <= 20 && (
                <p className="text-orange-600 text-xs font-body flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  Only {activeStock} left in stock — order soon
                </p>
              )}

              {/* Variants */}
              {p.variants?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-black/55 text-xs uppercase tracking-widest font-body">
                    Size / Variant
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {p.variants.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() =>
                          setSearchParams((prev) => {
                            const params = new URLSearchParams(prev);

                            params.set(v.option, v.optionValue);

                            return params;
                          })
                        }
                        aria-pressed={
                          searchParams.get(v.option) === v.optionValue
                        }
                        className={`px-4 py-2 rounded-xl border text-sm font-body transition-all duration-200
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                          ${
                            searchParams.get(v.option) === v.optionValue
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-black/15 text-black/65 hover:border-primary/50"
                          }`}
                      >
                        {v.label}
                        {v.priceAdd > 0 && (
                          <span className="ml-1 text-[10px] opacity-70">
                            +{fmt(v.priceAdd, p.currency)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isPhysical && (
                <div className="max-w-max flex items-center border border-black/15 rounded-full bg-secondary text-primary overflow-hidden py-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="w-8 h-8 rounded-full ml-1 flex items-center justify-center text-white bg-primary hover:bg-gold transition-colors duration-700 focus-visible:outline-none cursor-pointer"
                  >
                    <Minus size={12} aria-hidden="true" />
                  </button>
                  <span
                    className="w-8 text-center font-heading text-primary text-base select-none"
                    aria-live="polite"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(activeStock, q + 1))}
                    disabled={qty >= activeStock}
                    aria-label="Increase quantity"
                    className="w-8 h-8 rounded-full mr-1 flex items-center justify-center text-white bg-primary hover:bg-gold transition-colors duration-700 focus-visible:outline-none cursor-pointer"
                  >
                    <Plus size={12} aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Qty + Add to Cart + Buy Now */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddCart}
                  className="flex-1 px-4 py-2 cursor-pointer rounded-lg font-medium bg-primary text-white font-body text-sm sm:text-base tracking-widest uppercase flex items-center justify-center gap-1.5 hover:bg-gold hover:text-white active:scale-[0.98] transition-all duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-w-27.5"
                >
                  <AnimatePresence mode="wait">
                    {addedCart ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5"
                      >
                        <Check size={13} aria-hidden="true" /> Added!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="cart"
                        className="flex items-center gap-1.5"
                      >
                        {/* <ShoppingCart size={13} aria-hidden="true" />  */}
                        Add to Cart
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <button
                  onClick={handleBuyNow}
                  type="button"
                  className="flex-1 px-4 py-2 cursor-pointer rounded-lg bg-primary text-white border-2 font-body text-sm sm:text-base tracking-widest uppercase flex items-center justify-center gap-1.5 hover:bg-gold hover:text-white active:scale-[0.98] transition-all duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-w-25"
                >
                  {/* <Zap size={13} aria-hidden="true" />  */}
                  Buy Now
                </button>
              </div>

              {/* Digital notice */}
              {/* {isDigital && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/6 border border-primary/15">
                  <Download size={15} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-black/65 text-xs font-body leading-relaxed">
                    Instant delivery — download link sent to your email within seconds of purchase.
                    Access forever from your account dashboard.
                  </p>
                </div>
              )} */}

              {/* Trust badges */}
              {/* <div className="grid grid-cols-3 gap-0 border border-black/8 rounded-2xl mt-1 divide-x divide-black/8">
                {isPhysical ? (
                  <>
                    <TrustBadge
                      icon={Truck}
                      label="Free Shipping"
                      sub={`Above ${fmt(p.shipping.freeAbove, p.currency)}`}
                    />
                    <TrustBadge
                      icon={RotateCcw}
                      label={`${p.shipping.returnDays}-Day Returns`}
                      sub="No questions asked"
                    />
                    <TrustBadge
                      icon={Shield}
                      label="100% Authentic"
                      sub="Verified & energised"
                    />
                  </>
                ) : (
                  <>
                    <TrustBadge
                      icon={Download}
                      label="Instant Access"
                      sub="Lifetime downloads"
                    />
                    <TrustBadge
                      icon={Shield}
                      label="Secure Payment"
                      sub="256-bit encryption"
                    />
                    <TrustBadge
                      icon={RotateCcw}
                      label="30-Day Refund"
                      sub="No questions asked"
                    />
                  </>
                )}
              </div> */}
            </motion.div>
          </div>
        </div>

        <div className="border-t border-black/8 bg-secondary/10">
          <div className="max-w-7xl mx-auto px-5 py-12 sm:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-heading text-primary text-2xl mb-6">
                Product Details
              </h2>
              <div
                className="max-w-full mx-auto prose prose-sm prose-gray sm:prose-base prose-headings:font-philosopher [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary [&_h4]:text-primary [&_a]:text-primary [&_strong]:text-primary"
                dangerouslySetInnerHTML={{ __html: p.descriptionHtml }}
              />

              {p.highlights?.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-heading text-primary text-lg mb-4">
                    Highlights
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {p.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check
                            size={11}
                            className="text-primary"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="text-black/65 text-sm font-body">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
