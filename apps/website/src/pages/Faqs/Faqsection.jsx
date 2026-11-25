/* eslint-disable no-unused-vars */

import { useState, useId, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  User,
  Phone,
  BookOpen,
  ShoppingBag,
  CreditCard,
  HelpCircle,
  Settings,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useSettingStore } from "../../store/usSettingStore";



const CATEGORY_CONFIG = [
  {
    id: "about",
    label: "About Astro Sushil",
    icon: User,
    pageKeys: ["about"],
  },
  {
    id: "consultations",
    label: "Consultations",
    icon: Phone,
    pageKeys: ["consultations", "consultations "], // API has trailing space — handled below
  },
  {
    id: "courses",
    label: "Courses & Learning",
    icon: BookOpen,
    pageKeys: ["courses"],
  },
  {
    id: "products",
    label: "Digital Products",
    icon: ShoppingBag,
    pageKeys: ["digitalproducts"],
  },
  {
    id: "payments",
    label: "Payments & Refunds",
    icon: CreditCard,
    pageKeys: ["payments"],
  },
  {
    id: "support",
    label: "Support & Contact",
    icon: HelpCircle,
    pageKeys: ["supportcontact"],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Settings,
    pageKeys: ["advanced"],
  },
];


function FaqSchema({ categories }) {
  const allFaqs = categories.flatMap((c) => c.faqs);
  if (!allFaqs.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}


const sidebarListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
};

const accordionListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};


function AccordionItem({ faq, isOpen, onToggle }) {
  const uid = useId();
  const triggerId = `faq-trigger-${uid}`;
  const panelId = `faq-panel-${uid}`;

  return (
    <div className="mb-4">
      <dt className={`border border-gray-200 overflow-hidden ${isOpen ? "rounded-t-xl" : "rounded-xl"}`}>
        <button
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
        >
          <span className="text-lg font-heading font-medium leading-snug text-primary">
            {faq.q}
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </dt>

      <AnimatePresence initial={false}>
        {isOpen && (
          <dd
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden"
          >
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <div className="px-6 pb-5 pt-2">
                <p className="text-base text-gray-600">{faq.a}</p>
              </div>
            </motion.div>
          </dd>
        )}
      </AnimatePresence>
    </div>
  );
}


function SidebarItem({ category, isActive, onClick }) {
  const Icon = category.icon;
  return (
    <motion.button
      variants={sidebarItemVariants}
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      className={[
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left",
        "transition-colors duration-150 text-[14px] font-medium cursor-pointer",
        isActive
          ? "bg-gray-50 text-primary font-semibold"
          : "text-gray-500 hover:text-primary hover:bg-gray-50",
      ].join(" ")}
    >
      <Icon
        size={15}
        className={isActive ? "text-primary" : "text-gray-400"}
        strokeWidth={1.6}
        aria-hidden="true"
      />
      {category.label}
    </motion.button>
  );
}


function SkeletonFaqs() {
  return (
    <div className="flex-1 flex flex-col gap-3">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-14 rounded-xl bg-gray-100 animate-pulse"
        />
      ))}
    </div>
  );
}


export default function FaqSection({ faqs: reportFaqs }) {
  const { faqs, loading } = useSettingStore(
    useShallow((s) => ({ faqs: s.faqs, loading: s.loading }))
  );
  const fetchFAQs = useSettingStore((s) => s.fetchFAQs);

  const [activeCategory, setActiveCategory] = useState("about");
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    if (!reportFaqs) fetchFAQs();
  }, [fetchFAQs, reportFaqs]);

  const categories = useMemo(() =>
    CATEGORY_CONFIG.reduce((acc, config) => {
      const matched = faqs
        .filter((faq) => {
          if (!faq.isActive) return false;
          const normalised = (faq.page || "").trim().toLowerCase().replace(/\s+/g, "");
          return config.pageKeys.some(
            (key) => key.trim().toLowerCase().replace(/\s+/g, "") === normalised
          );
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((faq) => ({ q: faq.question, a: faq.answer }));

      if (matched.length) acc.push({ ...config, faqs: matched });
      return acc;
    }, []),
  [faqs]);

  const currentCategory =
    categories.find((c) => c.id === activeCategory) ?? categories[0];

  const handleCategoryChange = useCallback((id) => {
    setActiveCategory((prev) => {
      if (id === prev) return prev;
      setOpenIndex(0);
      return id;
    });
  }, []);

  const toggle = useCallback((i) => {
    setOpenIndex((prev) => (prev === i ? -1 : i));
  }, []);

  if (reportFaqs) {
    const mapped = reportFaqs.map((f) => ({ q: f.question, a: f.answer }));
    return (
      <section aria-labelledby="faq-heading" className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <h2
              id="faq-heading"
              className="text-3xl sm:text-4xl font-bold text-primary leading-tight"
            >
              Frequently Asked <span className="text-gold">Questions</span>
            </h2>
            <p className="mt-3 text-sm sm:text-lg text-black max-w-2xl mx-auto">
              Common questions about this report
            </p>
          </motion.div>

          {mapped.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No FAQs available for this report yet.
            </p>
          ) : (
            <motion.dl
              variants={accordionListVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="max-w-3xl mx-auto flex flex-col list-none"
            >
              {mapped.map((faq, i) => (
                <AccordionItem
                  key={i}
                  faq={faq}
                  isOpen={openIndex === i}
                  onToggle={() => toggle(i)}
                />
              ))}
            </motion.dl>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <FaqSchema categories={categories} />

      <section
        aria-labelledby="faq-heading"
        className="bg-white py-10"
      >
        <div className="max-w-7xl mx-auto px-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <h2
              id="faq-heading"
              className="text-3xl sm:text-4xl font-bold text-primary leading-tight"
            >
              Frequently Asked <span className="text-gold">Questions</span>
            </h2>
            <p className="mt-3 text-sm sm:text-lg text-black max-w-2xl mx-auto">
              Find answers to common questions about consultations, courses, and
              services
            </p>
          </motion.div>

          {/* Body */}
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-10">
            {/* Sidebar */}
            <nav aria-label="FAQ categories" className="sm:w-74 shrink-0">
              <p
                className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase mb-3 px-4"
                aria-hidden="true"
              >
                Quick Topics
              </p>

              {loading && !categories.length ? (
                // Skeleton sidebar while first load
                <div className="flex flex-col gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="h-10 rounded-lg bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <motion.ul
                  variants={sidebarListVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className="flex flex-col gap-0.5 list-none"
                >
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <SidebarItem
                        category={cat}
                        isActive={currentCategory?.id === cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                      />
                    </li>
                  ))}
                </motion.ul>
              )}
            </nav>

            {/* Accordion panel */}
            {loading && !categories.length ? (
              <SkeletonFaqs />
            ) : (
              <AnimatePresence mode="wait">
                <motion.dl
                  key={currentCategory?.id ?? "empty"}
                  variants={accordionListVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="flex-1 flex flex-col list-none"
                  aria-label={`${currentCategory?.label ?? ""} FAQ`}
                >
                  {currentCategory?.faqs.map((faq, i) => (
                    <AccordionItem
                      key={`${currentCategory.id}-${i}`}
                      faq={faq}
                      isOpen={openIndex === i}
                      onToggle={() => toggle(i)}
                    />
                  ))}

                  {!currentCategory?.faqs.length && (
                    <p className="text-sm text-gray-400 py-8 text-center">
                      No questions found for this category.
                    </p>
                  )}
                </motion.dl>
              </AnimatePresence>
            )}
          </div>
        </div>
      </section>
    </>
  );
}