/* eslint-disable no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import { Search, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/HeroPage";
import Pagination from "../../components/Pagination";
import ProductCard2 from "./ProductCard2";
import { useShallow } from "zustand/react/shallow";
import { useProductStore } from "../../store/useProductStore";
import { useAuthStore } from "../../store/useAuthStore";
import LoginRequiredModal from "../../utils/LoginRequiredModal";
import Seo from "../../components/Seo";

const PAGE_SIZE = 12;

function getBadge(p) {
  if (p.isBestSeller) return "Best Seller";
  if (p.isTrending) return "Trending";
  if (p.isFeatured) return "Featured";
  return null;
}

function getPrice(product) {
  if (product.hasVariants && product.variants?.length) {
    const prices    = product.variants.map((v) => v.price).filter(Boolean);
    const mrps      = product.variants.map((v) => v.mrp).filter(Boolean);
    const pricesUSD = product.variants.map((v) => v.priceUSD).filter(Boolean);
    const mrpsUSD   = product.variants.map((v) => v.mrpUSD).filter(Boolean);
    return {
      sale:   prices.length    ? Math.min(...prices)    : null,
      mrp:    mrps.length      ? Math.min(...mrps)      : null,
      usd:    pricesUSD.length ? Math.min(...pricesUSD) : null,
      mrpUsd: mrpsUSD.length   ? Math.min(...mrpsUSD)   : null,
    };
  }
  return {
    sale:   product.price    ?? null,
    mrp:    product.mrp      || null,
    usd:    product.priceUSD ?? null,
    mrpUsd: product.mrpUSD   ?? null,
  };
}

function fmt(n) {
  if (!n) return null;
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full max-w-xs sm:max-w-sm">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-black/15 bg-white text-black text-sm font-body placeholder-black/35 shadow-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-200"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/60 transition-colors"
        >
          <X size={15} />
        </button>
      ) : (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none">
          <Search size={15} />
        </span>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-black/8 overflow-hidden animate-pulse">
      <div className="h-52 bg-black/8" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 bg-black/8 rounded-full w-1/3" />
        <div className="h-4 bg-black/8 rounded-full w-full" />
        <div className="h-4 bg-black/8 rounded-full w-4/5" />
        <div className="h-8 bg-black/8 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function Shop() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuthStore();
  const { products, loading } = useProductStore(
    useShallow((s) => ({ products: s.products, loading: s.loading }))
  );
  const getProducts = useProductStore((s) => s.getProducts);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getProducts({ limit: 1000 });
  }, [getProducts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <>
      <Seo page="shop"  />
      <PageHero
        title="Our Shop"
        subtitle="Huge Range of Featured Products"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
        ]}
      />

      <main className="w-full bg-white">
        <div className="max-w-full mx-auto  px-8 py-10 sm:py-12 lg:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <p className="text-black/45 text-sm font-body">
              {loading
                ? "Loading products…"
                : filtered.length === 0
                  ? "No products found"
                  : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                      safePage * PAGE_SIZE,
                      filtered.length,
                    )} of ${filtered.length} products`}
            </p>
            <SearchBar value={search} onChange={handleSearch} />
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4  2xl:grid-cols-5 gap-5 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center">
                <Package size={28} className="text-primary/50" />
              </div>
              <p className="font-heading text-black/50 text-xl">
                No products found
              </p>
              <p className="text-black/35 text-sm font-body">
                Try a different search term
              </p>
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="mt-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-body hover:bg-primary/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Clear search
              </button>
            </motion.div>
          )}

          {!loading && paginated.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${search}-${safePage}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5  gap-5 sm:gap-6"
              >
                {paginated.map((product, i) => {
              const { sale, mrp, usd, mrpUsd } = getPrice(product);
                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.04 }}
                    >
                      <ProductCard2
                        user={user}
                        onLoginRequired={() => setShowLoginModal(true)}
                        _id={product._id}
                        image={product.thumbnail || product.images?.[0]}
                        badge={getBadge(product)}
                        title={product.name}
                        shortDescription={product.shortDescription}
                        originalPrice={fmt(mrp)}
                        salePrice={fmt(sale)}
                        gstType={product.gst?.type}
                         usdPrice={usd}
                          mrpUsdPrice={mrpUsd}
                        type={product.type}
                        rating={product.rating}
                        reviewsCount={product.reviewsCount}
                        hasVariants={product.hasVariants}
                        variants={product.variants ?? []}
                        onBook={() => navigate(`/product/${product.slug}`)}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-10 sm:mt-12">
              <Pagination
                current={safePage}
                total={totalPages}
                onChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Login Required"
          message="Please login to add items to your cart and continue shopping."
          redirectTo="/login"
        />
      </main>
    </>
  );
}
