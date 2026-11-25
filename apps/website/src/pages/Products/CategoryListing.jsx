/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, SlidersHorizontal, ArrowUpDown, Check } from "lucide-react";
import PageHero from "../../components/HeroPage";
import Pagination from "../../components/Pagination";
import BottomSheet from "../../components/BottomSheet";
import ProductCard2 from "./ProductCard2";
import CategoryCard from "./CategoryCard";
import FilterSidebar from "./FilterSidebar";
import { useProductStore } from "../../store/useProductStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useAuthStore } from "../../store/useAuthStore";
import LoginRequiredModal from "../../utils/LoginRequiredModal";
import Seo from "../../components/Seo";
import { slugifyCategoryName, unslugifyCategoryName } from "../../utils/categorySlug";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
];

const EMPTY_FILTERS = {
  quality: [],
  origin: [],
  originType: [],
  shape: [],
  inventoryType: [],
  minPrice: undefined,
  maxPrice: undefined,
  minWeight: undefined,
  maxWeight: undefined,
};

const FILTER_LIST_KEYS = ["quality", "origin", "originType", "shape", "inventoryType"];
const FILTER_RANGE_KEYS = ["minPrice", "maxPrice", "minWeight", "maxWeight"];

// Filters/sort/page used to live only in this component's local state —
// reloading the page, sharing the URL, or hitting the browser Back button
// all lost whatever the user had selected. Deriving them from the URL's
// search params instead (rather than a separate useState mirror) makes the
// URL the single source of truth: Back/Forward navigation "just works"
// because useSearchParams re-renders this component on every history change.
function filtersFromSearchParams(searchParams) {
  const filters = { ...EMPTY_FILTERS };

  for (const key of FILTER_LIST_KEYS) {
    const raw = searchParams.get(key);
    filters[key] = raw ? raw.split(",").filter(Boolean) : [];
  }

  for (const key of FILTER_RANGE_KEYS) {
    const raw = searchParams.get(key);
    filters[key] = raw != null && raw !== "" ? Number(raw) : undefined;
  }

  return filters;
}

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
    return {
      sale: prices.length ? Math.min(...prices) : null,
      mrp: mrps.length ? Math.min(...mrps) : null,
    };
  }
  return {
    sale: product.discountedPrice ?? product.price ?? null,
    mrp: product.mrp || product.price || null,
  };
}

export default function CategoryListing() {
  const { categorySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const categoryName = location.state?.categoryName || unslugifyCategoryName(categorySlug);

  const [showLoginModal, setShowLoginModal] = useState(false);
  // null | "filter" | "sort" — which mobile bottom sheet (if any) is open.
  // Desktop never touches this; the inline sidebar/sort dropdown stay put
  // there and this whole floating-button + sheet flow is `lg:hidden`.
  const [mobileSheet, setMobileSheet] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromSearchParams(searchParams);
  const productType =
    location.state?.productType || searchParams.get("productType") || "physical";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;
  const [directProducts, setDirectProducts] = useState([]);
  // The price/weight *slider track bounds* — deliberately frozen from the
  // category's first, filter-free fetch and never overwritten afterward.
  // `facets` itself is refetched with `includeFacets: true` on every filter
  // change and naturally narrows to match whatever's still in the filtered
  // result set — great for the checkbox facets, but applied to price/weight
  // it means the slider's own min/max shrinks to the currently-selected
  // range on every drag, which reads as the handle "snapping back" instead
  // of tracking the drag.
  const [rangeBounds, setRangeBounds] = useState(null);

  const { products, loading, total, facets, getProducts } = useProductStore();
  const {
    subcategories,
    subLoading,
    activeCategoryIds,
    activeCategoryDescription,
    categoryResolving,
    resolveCategoryIdsByName,
    fetchSubcategories,
  } = useCategoryStore();

  // Global stores (products/categories) don't reset themselves just because
  // this component unmounted and remounted (e.g. navigating to a product's
  // detail page and back) — without this, the very first render after a
  // remount shows whatever was left over from the *previous* time this page
  // was visited (a different filter/page, or even a different category)
  // before the fresh fetch overwrites it a moment later. `awaitingResolve`
  // forces the "still resolving" skeleton on every fresh mount and on every
  // slug change, closing that stale-render window instead of relying on the
  // stores' own loading flags (which are already `false` at that point,
  // since they only reflect the *previous* page's completed fetch).
  const [prevSlug, setPrevSlug] = useState(categorySlug);
  const [awaitingResolve, setAwaitingResolve] = useState(true);
  if (categorySlug !== prevSlug) {
    setPrevSlug(categorySlug);
    setDirectProducts([]);
    setAwaitingResolve(true);
    setRangeBounds(null);
  }

  // A different category shouldn't inherit the previous one's filters/sort/
  // page — clearing search params belongs to the router, not this
  // component's own state, so it's done from an effect rather than inline
  // during render (unlike the plain useState resets above). Skipped on the
  // very first mount so a shared/bookmarked URL with filters still lands
  // as intended.
  const isFirstCategoryMount = useRef(true);
  useEffect(() => {
    if (isFirstCategoryMount.current) {
      isFirstCategoryMount.current = false;
      return;
    }
    setSearchParams({ productType }, { replace: true });
  }, [categorySlug]);

  // Resolve the merged category's real ids (needed for subcategory chips).
  useEffect(() => {
    resolveCategoryIdsByName(categoryName, productType).finally(() => setAwaitingResolve(false));
  }, [categorySlug, productType]);

  useEffect(() => {
    if (activeCategoryIds.length) fetchSubcategories(activeCategoryIds, productType);
  }, [activeCategoryIds, productType]);

  // A category with children is a browsing step (show subcategory cards,
  // like the reference design's Gemstone -> Emerald/Ruby/... grid); only a
  // leaf category (no children) actually lists products + filters.
  const stillResolvingSubcategories = awaitingResolve || categoryResolving || subLoading;
  const hasChildren = !stillResolvingSubcategories && subcategories.length > 0;
  const isLeaf = !stillResolvingSubcategories && subcategories.length === 0;

  // Same staleness problem one level down: the debounce below exists so a
  // filter/slider drag doesn't fire a request per tick, but applying it to
  // the *first* fetch of a freshly-entered leaf category just adds a extra
  // 350ms where the previous category's (or previous filter's) product grid
  // is still on screen. Skipped only for that first fetch per category —
  // real filter changes afterward still debounce normally.
  const isFirstLeafFetch = useRef(true);
  useEffect(() => {
    isFirstLeafFetch.current = true;
  }, [categoryName]);

  useEffect(() => {
    if (!isLeaf) return;

    const params = {
      category: activeCategoryIds.join(","),
      type: productType,
      page,
      limit: PAGE_SIZE,
      sort,
      includeFacets: true,
    };

    for (const key of ["quality", "origin", "originType", "shape", "inventoryType"]) {
      if (filters[key]?.length) params[key] = filters[key].join(",");
    }
    if (filters.minPrice != null) params.minPrice = filters.minPrice;
    if (filters.maxPrice != null) params.maxPrice = filters.maxPrice;
    if (filters.minWeight != null) params.minWeight = filters.minWeight;
    if (filters.maxWeight != null) params.maxWeight = filters.maxWeight;

    if (isFirstLeafFetch.current) {
      isFirstLeafFetch.current = false;
      getProducts(params).then((res) => {
        if (res?.meta?.facets) {
          const { price, weight, weightUnit } = res.meta.facets;
          setRangeBounds({ price, weight, weightUnit });
        }
      });
      return;
    }

    // Debounced — the price/weight sliders update `filters` on every drag
    // tick, and this avoids firing a request per pixel of drag.
    const timeout = setTimeout(() => getProducts(params), 350);
    return () => clearTimeout(timeout);
    // `filters`/`sort`/`page` are recomputed fresh from `searchParams` on
    // every render (not held in their own useState), so they're a new
    // object/value each time regardless of whether the URL actually
    // changed — depending on them directly would re-run this effect on
    // every render. `searchParams.toString()` is the actual primitive
    // that only changes when the query string does, and it fully
    // determines filters/sort/page, so it's the correct dependency here.
  }, [isLeaf, activeCategoryIds.join(","), productType, searchParams.toString()]);

  // A non-leaf category can still carry products tagged directly to it
  // (e.g. general items not specific to any child) rather than only to its
  // children — those would otherwise be unreachable through this drill-down.
  // Detected client-side: fetch this category's descendant-inclusive
  // products and keep only the ones whose immediate category is one of
  // this exact merged category's own doc ids (not a descendant's).
  useEffect(() => {
    if (!hasChildren || !activeCategoryIds.length) return;

    getProducts({ category: activeCategoryIds.join(","), type: productType, limit: 100 }).then((res) => {
      const ownIds = new Set(activeCategoryIds.map(String));
      const direct = (res?.data || []).filter((p) =>
        ownIds.has(String(p.category?._id || p.category)),
      );
      setDirectProducts(direct);
    });
  }, [hasChildren, activeCategoryIds.join(","), productType]);

  // Single place that writes into the URL — anything falsy/empty is deleted
  // from the query string instead of written as an empty value, so the URL
  // stays clean (no `?quality=&sort=newest&page=1` noise) and `undefined` in
  // a patch reliably means "remove this key."
  const updateSearchParams = (patch) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(patch)) {
      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        next.delete(key);
      } else {
        next.set(key, Array.isArray(value) ? value.join(",") : String(value));
      }
    }

    setSearchParams(next, { replace: true });
  };

  const handleFilterChange = (patch) => {
    updateSearchParams({ ...patch, page: undefined });
  };

  const handleClearAll = () => {
    updateSearchParams({
      quality: undefined,
      origin: undefined,
      originType: undefined,
      shape: undefined,
      inventoryType: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minWeight: undefined,
      maxWeight: undefined,
      page: undefined,
    });
  };

  const handleSortChange = (value) => {
    updateSearchParams({ sort: value === "newest" ? undefined : value, page: undefined });
  };

  const handlePageChange = (nextPage) => {
    updateSearchParams({ page: nextPage === 1 ? undefined : nextPage });
  };

  const handleSubcategoryClick = (sub) => {
    navigate(`/products/${slugifyCategoryName(sub.name)}?productType=${productType}`, {
      state: { categoryName: sub.name, productType },
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Seo page="products" title={categoryName} />
      <PageHero
        title="Huge Range of Featured Products"
        highlight="Featured Products"
        subtitle="The extraordinary world of astrology, an ancient science that illuminates personality, purpose, and possibility. Every moment holds cosmic meaning"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          { label: categoryName, href: `/products/${categorySlug}` },
        ]}
      />

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 py-10 sm:py-12 lg:py-14">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <h1 className="font-heading text-primary text-2xl sm:text-3xl">
                Shop <span className="text-gold">{categoryName}</span>
              </h1>
              {activeCategoryDescription && (
                <p className="text-black/60 text-sm font-body mt-2 max-w-2xl">
                  {activeCategoryDescription}
                </p>
              )}
              {isLeaf && (
                <p className="text-black/40 text-sm font-body mt-1">{total} products</p>
              )}
            </div>

            {isLeaf && (
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="hidden lg:block px-4 py-2 rounded-xl border border-black/15 text-sm font-body text-black bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Still resolving this category / its children — don't guess yet */}
          {stillResolvingSubcategories && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-black/8 h-56 animate-pulse bg-black/5" />
              ))}
            </div>
          )}

          {/* Has children: browse further, like the reference design's
              Gemstone -> Emerald/Ruby/... card grid — no filters shown at
              this level, since facets are computed per leaf category. */}
          {hasChildren && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {subcategories.map((sub) => (
                  <CategoryCard
                    key={sub.name}
                    name={sub.name}
                    image={sub.image}
                    onClick={() => handleSubcategoryClick(sub)}
                  />
                ))}
              </motion.div>

              {directProducts.length > 0 && (
                <div className="mt-12">
                  <h2 className="font-heading text-primary text-xl mb-5">
                    More in {categoryName}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {directProducts.map((product) => {
                      const { sale, mrp } = getPrice(product);
                      return (
                        <ProductCard2
                          key={product._id}
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
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Leaf category: the actual product grid + data-driven filters */}
          {isLeaf && (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="hidden lg:block">
                <FilterSidebar
                  facets={facets && rangeBounds ? { ...facets, ...rangeBounds } : facets}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearAll={handleClearAll}
                />
              </div>

              <div className="flex-1 pb-20 lg:pb-0">
                {loading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-black/8 h-72 animate-pulse bg-black/5" />
                    ))}
                  </div>
                )}

                {!loading && products.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center">
                      <Package size={28} className="text-primary/50" />
                    </div>
                    <p className="font-heading text-black/50 text-xl">No products found</p>
                    <p className="text-black/35 text-sm font-body">Try adjusting your filters</p>
                  </div>
                )}

                {!loading && products.length > 0 && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${categoryName}-${page}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                    >
                      {products.map((product) => {
                        const { sale, mrp } = getPrice(product);
                        return (
                          <ProductCard2
                            key={product._id}
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
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                )}

                {totalPages > 1 && (
                  <div className="mt-10">
                    <Pagination
                      current={page}
                      total={totalPages}
                      onChange={(p) => {
                        handlePageChange(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile-only: filter/sort live in a bottom sheet instead of an
            inline sidebar + dropdown, which don't fit well on a small
            screen. Floating so they're reachable no matter how far down
            the product grid the user has scrolled. */}
        {isLeaf && (
          <div className="lg:hidden fixed bottom-4 inset-x-0 z-30 flex justify-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setMobileSheet("filter")}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-body text-sm font-medium shadow-lg shadow-primary/30"
            >
              <SlidersHorizontal size={15} /> Filter
            </button>
            <button
              type="button"
              onClick={() => setMobileSheet("sort")}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary border border-black/10 font-body text-sm font-medium shadow-lg"
            >
              <ArrowUpDown size={15} /> Sort
            </button>
          </div>
        )}

        <BottomSheet
          isOpen={mobileSheet === "filter"}
          onClose={() => setMobileSheet(null)}
          title="Filters"
          footer={
            <button
              type="button"
              onClick={() => setMobileSheet(null)}
              className="w-full py-3 rounded-xl bg-primary text-white font-body font-semibold text-sm"
            >
              Show {total} results
            </button>
          }
        >
          <FilterSidebar
            facets={facets && rangeBounds ? { ...facets, ...rangeBounds } : facets}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAll}
          />
        </BottomSheet>

        <BottomSheet
          isOpen={mobileSheet === "sort"}
          onClose={() => setMobileSheet(null)}
          title="Sort by"
        >
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  handleSortChange(opt.value);
                  setMobileSheet(null);
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-body text-left transition-colors
                  ${sort === opt.value ? "bg-primary/8 text-primary font-semibold" : "text-black/70 hover:bg-black/5"}`}
              >
                {opt.label}
                {sort === opt.value && <Check size={16} className="text-primary" />}
              </button>
            ))}
          </div>
        </BottomSheet>

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
