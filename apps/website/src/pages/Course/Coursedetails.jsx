/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Clock,
  Users,
  BookOpen,
  Play,
  ShoppingCart,
  Check,
  Share2,
  Heart,
  Globe,
  BarChart2,
  ExternalLink,
} from "lucide-react";
import PageHero from "../../components/HeroPage";
import { useParams } from "react-router-dom";
import { useCourseStore } from "../../store/courseStore";
import Seo from "../../components/Seo";

// ─── Skeleton helpers ────────────────────────────────────────────────────────

function Shimmer({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden bg-black/8 rounded-lg ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

function CourseDetailsSkeleton() {
  return (
    <>
      <div className="w-full bg-linear-to-br from-stone-900 to-stone-800 py-14 px-5">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20 flex flex-col gap-4">
          <Shimmer className="h-4 w-48 rounded-full bg-white/10" />
          <Shimmer className="h-10 w-3/4 bg-white/10" />
          <Shimmer className="h-5 w-1/2 bg-white/10" />
        </div>
      </div>

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20 py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-8 lg:gap-12">
            <div className="flex flex-col gap-8">
              <Shimmer className="w-full aspect-video rounded-2xl" />

              <div className="flex flex-wrap gap-4">
                {[120, 100, 90, 80].map((w, i) => (
                  <Shimmer
                    key={i}
                    className={`h-5 w-${w === 120 ? "32" : w === 100 ? "24" : w === 90 ? "20" : "16"}`}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Shimmer className="h-6 w-48" />
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-5/6" />
                <Shimmer className="h-4 w-4/6" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Shimmer className="w-5 h-5 rounded-full shrink-0" />
                    <Shimmer className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-6 rounded-2xl border border-black/10 overflow-hidden p-6 flex flex-col gap-4">
                <Shimmer className="h-6 w-24 rounded-full" />
                <Shimmer className="h-10 w-40" />
                <Shimmer className="h-12 w-full rounded-xl" />
                <div className="border-t border-black/8 pt-4 flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Shimmer key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function StarRow({ rating, size = 16 }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < fullStars
              ? "text-amber-400"
              : i === fullStars && hasHalf
                ? "text-amber-300"
                : "text-black/20"
          }
          fill={
            i < fullStars
              ? "currentColor"
              : i === fullStars && hasHalf
                ? "currentColor"
                : "none"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function StatPill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-black/55 text-sm font-body">
      <Icon size={14} className="text-primary/70 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function CourseImage({ src, title }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/5 shadow-md group">
      {!loaded && <Shimmer className="absolute inset-0 rounded-none" />}
      <motion.img
        src={src}
        alt={title}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        initial={{ scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6 }}
      />

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-200">
          <Play
            size={22}
            className="text-primary ml-1"
            fill="currentColor"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ course }) {
  const formatDuration = (mins) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0
      ? `${h} Hr${h > 1 ? "s" : ""} ${m > 0 ? `${m} Min` : ""}`.trim()
      : `${m} Min`;
  };

  const highlights = [
    course.language && `Language: ${course.language}`,
    course.level && `Level: ${course.level}`,
    course.totalDurationMinutes &&
      `${formatDuration(course.totalDurationMinutes)} of content`,
    course.isFree
      ? "Free course"
      : `Price: ₹${course.price?.toLocaleString("en-IN")}`,
    course.isFeatured && "Featured course",
    course.platformName && `Platform: ${course.platformName}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="font-heading text-black text-xl mb-3">
          About This Course
        </h3>
        <p className="text-black/65 text-sm sm:text-base font-body leading-relaxed">
          {course.shortDescription}
        </p>
      </div>

      {course.instructorName && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-black/3 border border-black/8">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-primary font-heading text-sm">
              {course.instructorName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-heading text-black text-sm">
              {course.instructorName}
            </p>
            <p className="text-black/45 text-xs font-body">Course Instructor</p>
          </div>
        </div>
      )}

      {highlights.length > 0 && (
        <div>
          <h3 className="font-heading text-black text-xl mb-4">
            Course Includes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check
                    size={11}
                    className="text-primary"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-black/70 text-sm font-body leading-relaxed">
                  {h}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {course.tags?.length > 0 && (
        <div>
          <h3 className="font-heading text-black text-xl mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {course.tags.map((tag, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-body border border-primary/15"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseCard({ course }) {
  const [wishlisted, setWishlisted] = useState(false);

  const formatDuration = (mins) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0
      ? `${h} Hr${h > 1 ? "s" : ""} ${m > 0 ? `${m} Min` : ""}`.trim()
      : `${m} Min`;
  };

  const handleEnroll = () => {
    if (course.redirectUrl) {
      window.open(course.redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="sticky top-6 bg-white rounded-2xl border border-black/10 shadow-xl overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        {course.isFeatured && (
          <span className="inline-flex items-center self-start px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-body font-medium">
            Featured
          </span>
        )}

        {course.isFree ? (
          <span className="font-heading text-black text-3xl">Free</span>
        ) : (
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-black text-3xl">
              {course.currency === "INR" ? "₹" : "$"}
              {course.price?.toLocaleString("en-IN")}
            </span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-black/35 text-base line-through font-body">
                {course.currency === "INR" ? "₹" : "$"}
                {course.originalPrice?.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        )}

        {!course.isFree && course.originalPrice > course.price && (
          <span className="self-start px-2.5 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-body font-medium">
            {Math.round(
              ((course.originalPrice - course.price) / course.originalPrice) *
                100,
            )}
            % off
          </span>
        )}

        <button
          type="button"
          onClick={handleEnroll}
          className="
            w-full py-3.5 rounded-xl bg-primary text-white
            font-heading text-sm tracking-widest uppercase
            flex items-center justify-center gap-2
            hover:bg-primary/85 active:scale-[0.98] transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            shadow-md shadow-primary/20
          "
        >
          {course.redirectUrl ? (
            <>
              <ExternalLink size={16} aria-hidden="true" />
              Enroll Now
            </>
          ) : (
            <>
              <ShoppingCart size={16} aria-hidden="true" />
              Enroll Now
            </>
          )}
        </button>
      </div>

      <div className="px-5 sm:px-6 pb-5 flex flex-col gap-2.5 border-t border-black/8 pt-4">
        <p className="font-heading text-black/60 text-xs uppercase tracking-widest mb-1">
          This course includes
        </p>
        {course.totalDurationMinutes && (
          <StatPill
            icon={Clock}
            label={`${formatDuration(course.totalDurationMinutes)} of content`}
          />
        )}
        {course.language && (
          <StatPill icon={Globe} label={`Language: ${course.language}`} />
        )}
        {course.level && (
          <StatPill icon={BarChart2} label={`Level: ${course.level}`} />
        )}
        {course.rating && (
          <StatPill icon={Star} label={`Rating: ${course.rating} / 5`} />
        )}
        {course.category && (
          <StatPill icon={BookOpen} label={`Category: ${course.category}`} />
        )}
      </div>

      <div className="flex items-center justify-between px-5 sm:px-6 pb-5 gap-3">
        <button
          type="button"
          onClick={() => setWishlisted((w) => !w)}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="flex items-center gap-1.5 text-xs font-body text-black/50 hover:text-red-500 transition-colors"
        >
          <Heart
            size={15}
            className={wishlisted ? "text-red-500 fill-red-500" : ""}
            aria-hidden="true"
          />
          {wishlisted ? "Wishlisted" : "Wishlist"}
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-body text-black/50 hover:text-primary transition-colors"
          aria-label="Share this course"
        >
          <Share2 size={15} aria-hidden="true" />
          Share
        </button>
      </div>
    </div>
  );
}

export default function Coursedetails() {
  const { slug } = useParams();
  const { course, getCourseBySlug, loading, error } = useCourseStore();

  useEffect(() => {
    if (slug) getCourseBySlug(slug);
  }, [slug]);

  if (loading) return <CourseDetailsSkeleton />;

  if (error || !course) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <BookOpen size={28} className="text-red-400" />
        </div>
        <h2 className="font-heading text-black text-2xl">Course Not Found</h2>
        <p className="text-black/55 font-body text-sm max-w-xs">
          {error ||
            "We couldn't find this course. It may have been moved or removed."}
        </p>
        <a
          href="/courses/"
          className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-heading tracking-wider uppercase hover:bg-primary/85 transition-colors"
        >
          Browse Courses
        </a>
      </div>
    );
  }

  const formatDuration = (mins) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0
      ? `${h} Hr${h > 1 ? "s" : ""} ${m > 0 ? `${m} Min` : ""}`.trim()
      : `${m} Min`;
  };

  return (
    <>
     <Seo
        title={course.metaTitle || course.title}
        description={course.metaDescription || course.shortDescription?.slice(0, 160)}
        keywords={course.keywords?.join(", ")}
        image={course.thumbnail}
      />
      
      <PageHero
        title={course.title}
        subtitle={
          course.shortDescription?.slice(0, 120) +
          (course.shortDescription?.length > 120 ? "…" : "")
        }
        breadcrumbs={[
          { label: "Courses", href: "/courses/" },
          { label: course.title, href: "#" },
        ]}
      />

      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20 py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-8 lg:gap-12">
            <div className="flex flex-col gap-8 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {course.thumbnail ? (
                  <CourseImage src={course.thumbnail} title={course.title} />
                ) : (
                  <div className="w-full aspect-video rounded-2xl bg-black/5 flex items-center justify-center">
                    <BookOpen size={48} className="text-black/20" />
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-wrap items-center gap-4"
              >
                {course.rating > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <StarRow rating={course.rating} />
                      <span className="text-amber-500 font-heading text-sm">
                        {course.rating}
                      </span>
                      {course.totalReviews > 0 && (
                        <span className="text-black/40 text-sm font-body">
                          ({course.totalReviews} reviews)
                        </span>
                      )}
                    </div>
                    <div className="w-px h-4 bg-black/15" aria-hidden="true" />
                  </>
                )}
                {course.totalDurationMinutes && (
                  <StatPill
                    icon={Clock}
                    label={formatDuration(course.totalDurationMinutes)}
                  />
                )}
                {course.language && (
                  <StatPill icon={Globe} label={course.language} />
                )}
                {course.level && (
                  <StatPill icon={BarChart2} label={course.level} />
                )}
              </motion.div>

              <div className="lg:hidden">
                <PurchaseCard course={course} />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <OverviewTab course={course} />
              </motion.div>
            </div>

            <div className="hidden lg:block">
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
              >
                <PurchaseCard course={course} />
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
