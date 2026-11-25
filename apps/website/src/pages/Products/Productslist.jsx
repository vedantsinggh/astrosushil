/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Search, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHero from "../../components/HeroPage";
import Pagination from "../../components/Pagination";
import ProductCard2 from "./ProductCard2";
import CategoryCard from "./CategoryCard";
import { useProductStore } from "../../store/useProductStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import LoginRequiredModal from "../../utils/LoginRequiredModal";
import Seo from "../../components/Seo";
import { useWishlistStore } from "../../store/useWishlistStore";
import { slugifyCategoryName } from "../../utils/categorySlug";

const PAGE_SIZE = 12;

const TABS = [
  { id: "physical", label: "Physical Products" },
  { id: "digital", label: "Digital Products" },
];

function getBadge(p) {
  if (p.isBestSeller) return "Best Seller";
  if (p.isTrending) return "Trending";
  if (p.isFeatured) return "Featured";
  return null;
}

function getPrice(product) {
  if (product.hasVariants && product.variants?.length) {
    const prices = product.variants.map((v) => v.price).filter(Boolean);
    const mrps = product.variants.map((v) => v.mrp).filter(Boolean);
    const pricesUSD = product.variants.map((v) => v.priceUSD).filter(Boolean);
    const mrpsUSD = product.variants.map((v) => v.mrpUSD).filter(Boolean);
    return {
      sale: prices.length ? Math.min(...prices) : null,
      mrp: mrps.length ? Math.min(...mrps) : null,
      usd: pricesUSD.length ? Math.min(...pricesUSD) : null,
      mrpUsd: mrpsUSD.length ? Math.min(...mrpsUSD) : null,
    };
  }
  return {
    sale: product.price ?? null,
    mrp: product.mrp || null,
    usd: product.priceUSD ?? null,
    mrpUsd: product.mrpUSD ?? null,
  };
}

function fmt(n) {
  if (!n) return null;
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function SearchBar({ value, onChange, onRemove, placeholder = "Search products…" }) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-4 pr-11 py-2.5 rounded-full border-2 border-primary placeholder:text-primary bg-white text-black text-sm font-body shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
      />
      {value ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Clear"
          className="absolute right-px top-[50%] -translate-y-1/2 bg-primary rounded-full p-3.5 text-white cursor-pointer"
        >
          <X size={15} />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Search"
          className="absolute right-px top-[50%] -translate-y-1/2 pointer-events-none bg-primary rounded-full p-3.5 text-white"
        >
          <Search size={15} />
        </button>
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

export default function ProductsList() {
  const { getWishlist } = useWishlistStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuthStore();
  const { products, loading, getProducts } = useProductStore();
  const { topLevelCategories, loading: categoriesLoading, fetchTopLevelCategories } =
    useCategoryStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("type") === "digital" ? "digital" : "physical";

  const activeTab = requestedTab;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user) getWishlist();
  }, [user]);

  // Tab-default browsing — only while there's no active search term.
  // Digital's default view is a flat product grid (type:"digital");
  // physical's default view is the category-card browser. Searching
  // overrides both of these entirely (see the effect below), so this skips
  // re-fetching on every keystroke once a search is in progress.
  useEffect(() => {
    if (search.trim()) return;
    if (activeTab === "physical") {
      fetchTopLevelCategories(activeTab);
      return;
    }
    getProducts({ type: activeTab, limit: 1000 });
  }, [activeTab, search]);

  // Global search — matches products of *any* type, regardless of which
  // tab happens to be active. Previously a search only ever looked within
  // the current tab's own type (the physical tab queried the backend with
  // type:"physical"; the digital tab client-filtered an already
  // type:"digital" list), so the same term could show physical results on
  // one tab and nothing on the other. Tabs are purely a default-browsing
  // affordance now — typing here always searches everything.
  useEffect(() => {
    if (!search.trim()) return;

    const timeout = setTimeout(() => {
      getProducts({ search: search.trim(), limit: 1000 });
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const isSearching = search.trim().length > 0;

  // No client-side filtering needed either way — a search comes back
  // pre-filtered by name from the backend, and the no-search digital grid
  // is already scoped to type:"digital" server-side.
  const filteredProducts = products;

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSearchRemove = () => setSearch("");

  const handleTabChange = (tabId) => {
    setSearch("");
    setPage(1);
    if (tabId === "digital") {
      setSearchParams({ type: tabId });
    } else {
      setSearchParams({});
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Category cards only ever show for the physical tab's own default
  // (unsearched) view — any active search always shows the flat product
  // grid instead, on either tab.
  const showCategoryCards = activeTab === "physical" && !isSearching;
  const isLoading = showCategoryCards ? categoriesLoading : loading;

  return (
    <>
      <Seo page="products" />
      <PageHero
        title="Huge Range of Featured Products"
        highlight="Featured Products"
        subtitle="Discover authentic astrology products, digital wallpapers, gemstones, Rudraksha, Yantras, and Vedic remedy kits carefully selected to support your spiritual journey, positive energy, and daily life."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
        ]}
      />

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 py-10 sm:py-12 lg:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div
              className="flex gap-3 flex-wrap"
              role="tablist"
              aria-label="Product types"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  type="button"
                  className={`relative cursor-pointer flex items-center gap-2 px-8 sm:px-10 lg:px-16 py-2.5 rounded-xl font-heading font-semibold text-sm sm:text-lg transition-all duration-700
                    focus-visible:outline-none
                      ${
                        activeTab === tab.id && tab.id === "physical"
                          ? "bg-gold text-white"
                          : activeTab === tab.id && tab.id === "digital"
                            ? "text-white bg-gold"
                            : "bg-[url('/Image/card-bg.webp')] bg-cover bg-center bg-no-repeat hover:bg-gold text-white"
                      }`}
                >
                  <img
                    src="/Image/mission-icon.png"
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                    className="absolute left-1 sm:top-2 sm:left-2 -translate-x-1/2 sm:w-8 sm:h-8 object-contain z-5"
                  />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-md ring-2 ring-inset ring-white/20"
                    />
                  )}
                </button>
              ))}
            </div>
            <SearchBar
              value={search}
              onChange={handleSearch}
              onRemove={handleSearchRemove}
              placeholder="Search products…"
            />
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* ── Physical, no search: category cards ── */}
          {!isLoading && showCategoryCards && (
            <>
              {topLevelCategories.length === 0 ? (
                <EmptyState onClear={() => handleSearch("")} search={search} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                >
                  {topLevelCategories.map((cat) => (
                    <CategoryCard
                      key={cat.name}
                      name={cat.name}
                      image={cat.image}
                      onClick={() =>
                        navigate(`/products/${slugifyCategoryName(cat.name)}?productType=${activeTab}`, {
                          state: { categoryName: cat.name, productType: activeTab },
                        })
                      }
                    />
                  ))}
                </motion.div>
              )}
            </>
          )}

          {/* ── Digital tab's default view, or an active search on either tab: flat product grid ── */}
          {!isLoading && !showCategoryCards && (
            <>
              {paginated.length === 0 ? (
                <EmptyState onClear={() => handleSearch("")} search={search} />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${search}-${safePage}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  >
                    {paginated.map((product, i) => {
                      const { sale, mrp } = getPrice(product);
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
                            originalPrice={mrp}
                            salePrice={sale}
                            gstType={product.gst?.type}
                            type={product.type}
                            rating={product.rating}
                            reviewsCount={product.reviewsCount}
                            hasVariants={product.hasVariants}
                            soldByRatti={product.soldByRatti}
                            variants={product.variants ?? []}
                            stock={product.stock}
                            quality={product.externalMeta?.quality}
                            origin={product.externalMeta?.origin}
                            originType={product.externalMeta?.originType}
                            sku={product.sku}
                            requiresDetailPage={
                              product.source === "huelane" &&
                              product.externalMeta?.pricingModel === "per_weight"
                            }
                            onBook={() => navigate(`/product/${product.slug}`)}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}

              {totalPages > 1 && (
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
            </>
          )}
        </div>
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Login Required"
          message="Please login to add items to your cart and continue shopping."
          redirectTo="/dashboard/"
        />
      </main>
    </>
  );
}

function EmptyState({ onClear, search }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center">
        <Package size={28} className="text-primary/50" />
      </div>
      <p className="font-heading text-black/50 text-xl">Nothing found</p>
      {search && (
        <>
          <p className="text-black/35 text-sm font-body">Try a different search term</p>
          <button
            type="button"
            onClick={onClear}
            className="mt-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-body hover:bg-primary/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Clear search
          </button>
        </>
      )}
    </motion.div>
  );
}
