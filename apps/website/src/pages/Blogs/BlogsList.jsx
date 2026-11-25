/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { Search, X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useSettingStore } from "../../store/usSettingStore";
import PageHero from "../../components/HeroPage";
import BlogCard from "./BlogCard";
import Pagination from "../../components/Pagination";
import Seo from "../../components/Seo";

const BLOGS_PER_PAGE = 6;

const ALL = "All";

export default function BlogsList() {
  const { blogs, loading } = useSettingStore(
    useShallow((s) => ({ blogs: s.blogs, loading: s.loading })),
  );
  const fetchBlogs = useSettingStore((s) => s.fetchBlogs);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchBlogs({ limit: 1000 });
  }, [fetchBlogs]);

  const categories = useMemo(() => {
    const cats = blogs.map((b) => b.category).filter(Boolean);
    return [ALL, ...Array.from(new Set(cats))];
  }, [blogs]);

  const filtered = useMemo(() => {
    return blogs.filter((b) => {
      const matchCat = activeCategory === ALL || b.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        b.title?.toLowerCase().includes(q) ||
        b.shortDescription?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [blogs, activeCategory, search]);

  useEffect(() => {
    setPage(1);
  }, [search, activeCategory]);

  const totalPages = Math.ceil(filtered.length / BLOGS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * BLOGS_PER_PAGE,
    page * BLOGS_PER_PAGE,
  );

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
  };

  const handleSearchClear = () => {
    setSearch("");
  };

  return (
    <>
      <Seo page="blog" />
      <PageHero
        title="Astrology Blogs"
        highlight="Blogs"
        subtitle="Learn astrology through practical articles, Kundli guides, horoscope insights, Vastu tips, numerology, and simple Vedic remedies. Every article is written to help you understand astrology in an easy and meaningful way."
        image="/Image/page-hero-bg.webp"
        breadcrumbs={[{ label: "Blog", href: "/blogs" }]}
      />

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-4 py-1.5 cursor-pointer rounded-full text-sm font-body font-medium  transition-all duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                    ${
                      activeCategory === cat
                        ? "bg-gold text-white border-gold shadow-sm"
                        : "bg-primary text-white hover:bg-gold"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-xs sm:max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blogs…"
                aria-label="Search blogs"
                className="w-full pl-4 pr-11 py-2.5 rounded-full border-2 border-primary placeholder:text-primary bg-white text-black text-sm font-body shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              />
              {search ? (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  aria-label="Clear"
                  className="absolute right-px top-[57%] -translate-y-1/2 pointer-events-none bg-primary rounded-full p-3.5 text-white"
                >
                  <X size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Search"
                  className="absolute right-px top-[57%] -translate-y-1/2 pointer-events-none bg-primary rounded-full p-3.5 text-white"
                >
                  <Search size={15} />
                </button>
              )}
            </div>
          </div>

          {/* {!loading && (
            <p className="text-black/40 text-xs font-body mb-6">
              {filtered.length === 0
                ? "No blogs found"
                : `Showing ${(page - 1) * BLOGS_PER_PAGE + 1}–${Math.min(
                    page * BLOGS_PER_PAGE,
                    filtered.length,
                  )} of ${filtered.length} articles`}
            </p>
          )} */}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-black/8 overflow-hidden animate-pulse"
                >
                  <div className="h-44 bg-black/8" />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="h-3 bg-black/8 rounded-full w-2/3" />
                    <div className="h-4 bg-black/8 rounded-full w-full" />
                    <div className="h-4 bg-black/8 rounded-full w-4/5" />
                    <div className="h-3 bg-black/8 rounded-full w-full mt-1" />
                    <div className="h-3 bg-black/8 rounded-full w-3/4" />
                  </div>
                </div>
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
                <BookOpen size={28} className="text-primary/50" />
              </div>
              <p className="font-heading text-black/50 text-lg">
                No articles found
              </p>
              <p className="text-black/35 text-sm font-body text-center max-w-xs">
                Try adjusting your search or selecting a different category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory(ALL);
                }}
                className="mt-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-body font-medium hover:bg-primary/85 transition-colors"
              >
                Clear filters
              </button>
            </motion.div>
          )}

          {!loading && paginated.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeCategory}-${search}-${page}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {paginated.map((blog, i) => (
                  <motion.div
                    key={blog._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                  >
                    <BlogCard item={blog} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-10">
              <Pagination
                current={page}
                total={totalPages}
                onChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
