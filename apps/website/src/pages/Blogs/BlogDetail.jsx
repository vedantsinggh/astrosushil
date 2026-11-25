/* eslint-disable no-unused-vars */
import React, { useEffect } from "react";
import { ArrowLeft, Calendar, User, Tag, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingStore } from "../../store/usSettingStore";
import Seo from "../../components/Seo";
import PageHero from "@/components/HeroPage";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const slideLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "");
}

function estimateReadTime(content) {
  const words = stripHtml(content).split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function BlogDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { blog, loading, error, fetchBlogBySlug } = useSettingStore();

  useEffect(() => {
    if (slug) fetchBlogBySlug(slug);
  }, [slug, fetchBlogBySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-500 text-sm"
        >
          Loading blog…
        </motion.p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-red-500 text-lg mb-6">
            {error || "Blog not found"}
          </p>
          <button
            onClick={() => navigate("/blog")}
            className="px-8 py-3 bg-primary text-white rounded-full hover:bg-primary/80 transition-colors duration-700 text-sm font-medium"
          >
            ← Back to Blogs
          </button>
        </motion.div>
      </div>
    );
  }

  const plainContent = stripHtml(blog.content);
  const readTime = estimateReadTime(blog.content);

  return (
    <>
      <Seo
        title={blog?.seo?.metaTitle || blog?.title}
        description={blog?.seo?.metaDescription || blog?.shortDescription}
        keywords={blog?.seo?.keywords?.join(", ")}
        image={blog?.thumbnail?.url}
      />

      <PageHero
        title="Astrologer Blogs"
        subtitle="The extraordinary world of astrology, an ancient science that illuminates personality, purpose, and possibility. Every moment holds cosmic meaning"
        highlight="Blogs"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Blogs", href: "/blog" },
          { label: "Blog Details", href: `/blog/${blog.slug}` },
        ]}
      />

      <AnimatePresence>
        <div className="min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-12 lg:py-14">
            {/* <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-center mb-10 sm:mb-14"
            >
              {(blog.category || blog.tag) && (
                <motion.span
                  variants={fadeUp}
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  className="inline-block bg-gold  text-white text-xs  px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider"
                >
                  {blog.category || blog.tag}
                </motion.span>
              )}

              <motion.h1
                variants={fadeUp}
                custom={1}
                initial="hidden"
                animate="visible"
                className="  text-xl sm:text-2xl  lg:text-3xl font-bold text-gray-900 mb-2 font-philosopher leading-tight  mx-auto"
              >
                {blog.title}
              </motion.h1>

              <motion.div
                variants={fadeUp}
                custom={3}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500"
              >
                {blog.author && (
                  <div className="flex items-center gap-2">
                    {blog.author.picture?.url ? (
                      <img
                        src={blog.author.picture.url}
                        alt={blog.author.name}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-teal-100"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-teal-700" />
                      </span>
                    )}
                    <span className="font-medium text-gray-700">
                      {blog.author.name}
                    </span>
                  </div>
                )}

                {blog.createdAt && (
                  <>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{formatDate(blog.createdAt)}</span>
                    </div>
                  </>
                )}

                <span className="text-gray-300 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>{readTime}</span>
                </div>

                {blog.tag && (
                  <>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-teal-700 font-medium">
                        {blog.tag}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div> */}

            <div className="grid grid-cols-1 gap-8 lg:gap-14 mb-14 items-start">
              {/* Blog Image */}
              <motion.div
                variants={slideLeft}
                initial="hidden"
                animate="visible"
                className="relative"
              >
                <div className="rounded-2xl overflow-hidden shadow-xl shadow-primary/10 p-2 border border-dashed border-gold">
                  <motion.img
                    src={
                      blog.thumbnail?.url ||
                      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800"
                    }
                    alt={blog.title}
                    className="w-full sm:h-80 lg:h-110 object-cover rounded-xl"
                    initial={{ scale: 1.06 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800";
                    }}
                  />
                </div>

                {/* Floating badge */}
                {blog.category && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur border border-primary text-primary text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                  >
                    {blog.category}
                  </motion.div>
                )}
              </motion.div>

              {/* Right Column */}
              <motion.div
                variants={slideRight}
                initial="hidden"
                animate="visible"
                className="flex flex-col justify-center space-y-6"
              >
                <div className="text-sm sm:text-base text-gray-600 leading-relaxed text-center lg:text-left">
                  <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                    {blog.title}
                  </h1>
                  <p className="line-clamp-6">
                    {blog.shortDescription || plainContent.slice(0, 200)}
                  </p>
                </div>

                <motion.div
                  variants={fadeUp}
                  custom={3}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-wrap items-center justify-start gap-4 sm:gap-6 text-sm text-gray-500"
                >
                  {/* {blog.author && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.45 }}
                    className="flex items-center gap-3 bg-primary/10 rounded-xl px-4 py-3 border border-primary/20 max-w-max mx-auto lg:mx-0"
                  >
                    {blog.author.picture?.url ? (
                      <img
                        src={blog.author.picture.url}
                        alt={blog.author.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {blog.author.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {blog.author.email}
                      </p>
                    </div>
                  </motion.div>
                )} */}

                  {blog.author && (
                    <div className="flex items-center gap-2">
                      {blog.author.picture?.url ? (
                        <img
                          src={blog.author.picture.url}
                          alt={blog.author.name}
                          className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/30"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </span>
                      )}
                      <span className="font-medium text-gray-700">
                        {blog.author.name}
                      </span>
                    </div>
                  )}

                  {blog.createdAt && (
                    <>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{formatDate(blog.createdAt)}</span>
                      </div>
                    </>
                  )}

                  <span className="text-gray-300 hidden sm:inline">|</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{readTime}</span>
                  </div>

                  {blog.tag && (
                    <>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                        <span className="text-primary font-medium">
                          {blog.tag}
                        </span>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="pt-5 border-t border-gray-100"
            >
              <motion.div
                variants={fadeUp}
                custom={1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="max-w-full mx-auto prose lg:prose-2xl prose-gray sm:prose-base prose-headings:font-philosopher [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary [&_h4]:text-primary [&_a]:text-primary [&_strong]:text-primary"
              >
                {/* Render HTML content safely */}
                {blog.content?.startsWith("<") ? (
                  <div
                    className="text-gray-700 leading-relaxed text-sm sm:text-base text-justify
                      [&_table]:w-auto [&_table]:border-collapse [&_table]:my-6 [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:shadow-sm [&_table]:border [&_table]:border-gray-200 [&_thead]:bg-primary/10
                      [&_th]:px-5 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-primary [&_th]:border [&_th]:border-primary/20 [&_th]:align-middle
                      [&_td]:px-5 [&_td]:py-3 [&_td]:text-sm [&_td]:text-gray-700 [&_td]:border [&_td]:border-gray-200 [&_td]:align-middle [&_td]:text-left
                      [&_td:first-child]:whitespace-nowrap [&_th:first-child]:whitespace-nowrap [&_tbody_tr:nth-child(even)]:bg-gray-50
                      [&_tbody_tr:hover]:bg-primary/5 [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150 [&_table]:block [&_table]:overflow-x-auto sm:[&_table]:table"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base text-justify whitespace-pre-line">
                    {blog.content}
                  </p>
                )}
              </motion.div>
            </motion.div>

            {/* <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-5 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex flex-wrap gap-2">
                {blog.category && (
                  <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-3 py-1 rounded-full">
                    {blog.category}
                  </span>
                )}
                {blog.tag && blog.tag !== blog.category && (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-3 py-1 rounded-full">
                    {blog.tag}
                  </span>
                )}
              </div>
              {blog.updatedAt && (
                <p className="text-xs text-gray-400">
                  Updated {formatDate(blog.updatedAt)}
                </p>
              )}
            </motion.div> */}
          </div>
        </div>
      </AnimatePresence>
    </>
  );
}
