/* eslint-disable no-unused-vars */
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CourseCard from "./Coursecard"; // adjust
import { useShallow } from "zustand/react/shallow";
import { useCourseStore } from "../../store/courseStore";

const SHOW = 4;

/* Skeleton */
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

const fmt = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : null);

export default function CourseSection() {
  const { courses, loading } = useCourseStore(
    useShallow((s) => ({ courses: s.courses, loading: s.loading })),
  );
  const getCourses = useCourseStore((s) => s.getCourses);
  const navigate = useNavigate();

  useEffect(() => {
    getCourses({ limit: SHOW, isFeatured: true });
  }, [getCourses]);

  const visible = courses.slice(0, SHOW);

  return (
    <section className="py-16 px-4 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-5">
        <div className="relative flex flex-col items-center text-center gap-2 mb-12 sm:mb-14">
          <span className="text-sm sm:text-base font-body font-semibold text-primary uppercase">
            ONLINE ASTROLOGY LEARNING
          </span>
          <h2 className="text-primary text-3xl sm:text-4xl md:text-5xl leading-tight font-heading">
            Vedic <span className="text-gold">Astrology Courses</span> for
            Beginners & Professionals
          </h2>
          <p className="text-primary text-sm md:text-xl font-body max-w-5xl mx-auto">
            Astrology courses on the platform are designed to help learners
            understand the fundamentals and advanced concepts of astrology.
            Guided by experienced astrologers, users can explore topics like
            birth charts, planetary movements, and predictive techniques.
          </p>
          <button
            type="button"
            onClick={() => navigate("/courses/")}
            className="md:absolute md:top-0 md:right-0 bg-primary hover:bg-gold transition-colors duration-700 text-white rounded-full px-5 py-2 text-xs font-body font-medium cursor-pointer tracking-wide focus-visible:outline-none"
          >
            View More
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: SHOW }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {visible.map((course, i) => (
              <motion.div
                key={course._id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <CourseCard
                  slug={course.slug}
                  duration={course.totalDurationMinutes}
                  image={course.thumbnail}
                  rating={course.rating}
                  title={course.title}
                  description={course.shortDescription}
                  level={course.level}
                  language={course.language}
                  salePrice={course.price}
                  originalPrice={course.originalPrice}
                  isFree={course.isFree}
                  link={course.redirectUrl}
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
        )}
      </div>
    </section>
  );
}
