/* eslint-disable no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import { Search, X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHero from "../../components/HeroPage";
import CourseCard from "./Coursecard";
import Pagination from "../../components/Pagination";
import { useShallow } from "zustand/react/shallow";
import { useCourseStore } from "../../store/courseStore";
import Seo from "../../components/Seo";

const PAGE_SIZE = 8;

const fmt = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : null);

function SearchBar({ value, onChange }) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search courses…"
        aria-label="Search courses"
        className="w-full pl-4 pr-11 py-2.5 rounded-full border-2 border-primary placeholder:text-primary bg-white text-black text-sm font-body shadow-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
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
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-black/8 overflow-hidden animate-pulse">
      <div className="h-44 bg-black/8" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 bg-black/8 rounded-full w-1/2" />
        <div className="h-4 bg-black/8 rounded-full w-full" />
        <div className="h-3 bg-black/8 rounded-full w-3/4" />
        <div className="h-8 bg-black/8 rounded-xl mt-1" />
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { courses, loading } = useCourseStore(
    useShallow((s) => ({ courses: s.courses, loading: s.loading })),
  );
  const getCourses = useCourseStore((s) => s.getCourses);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getCourses({ limit: 1000 });
  }, [getCourses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.shortDescription?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q),
    );
  }, [courses, search]);

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
      <Seo page="courses" />
      <PageHero
        title="Online Astrology Courses"
        highlight="Courses"
        subtitle="Master Vedic astrology through structured online courses. Learn Kundli reading, prediction techniques, and practical applications."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses/" },
        ]}
      />

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 py-10 sm:py-12 lg:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-8">
            {/* <p className="text-black/45 text-sm font-body">
              {loading
                ? "Loading courses…"
                : filtered.length === 0
                  ? "No courses found"
                  : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} courses`}
            </p> */}
            <SearchBar value={search} onChange={handleSearch} />
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
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
                <BookOpen size={28} className="text-primary/50" />
              </div>
              <p className="font-heading text-black/50 text-xl">
                No courses found
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

          {/* Grid */}
          {!loading && paginated.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${search}-${safePage}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
              >
                {paginated.map((course, i) => (
                  <motion.div
                    key={course._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: i * 0.04 }}
                  >
                    <CourseCard
                      image={course.thumbnail}
                      rating={course.rating}
                      title={course.title}
                      duration={course.totalDurationMinutes}
                      description={course.shortDescription}
                      level={course.level}
                      language={course.language}
                      salePrice={course.price}
                      originalPrice={course.originalPrice}
                      link={course.redirectUrl}
                      isFree={course.isFree}
                      onBook={() => {
                        if (course.redirectUrl)
                          window.open(
                            course.redirectUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Pagination */}
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
      </main>
    </>
  );
}
