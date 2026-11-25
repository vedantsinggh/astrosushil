/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Scale,
  Ban,
  RefreshCw,
  Globe,
  Mail,
  ChevronRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

import { useEffect } from "react";
import { useSettingStore } from "../../store/usSettingStore";
import Seo from "../../components/Seo";
import PageHero from "../../components/HeroPage";

export default function TermsConditions() {
  const navigate = useNavigate();
  const { settings, fetchSettings, loading } = useSettingStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const termsHtml = settings?.legal?.termsConditions;

  return (
    <>
      <Seo page="terms" />

      <PageHero
        title="Terms & Conditions"
        highlight="Conditions"
        subtitle="Read the terms governing the use of Astro Sushil's website, consultations, courses, products, and digital services before using our platform."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Terms & Conditions", href: "/terms-conditions" },
        ]}
      />

      <div className="min-h-screen bg-[#f5f7f6]">
        <div className="max-w-7xl mx-auto px-5 py-10 space-y-6">
          {/* <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-8 flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Scale className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Terms & Conditions
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
                Please read these terms carefully before using our services.
              </p>
            </div>
          </motion.div> */}

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="overflow-hidden"
          >
            {/* <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 bg-teal-50/40">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                <Scale className="w-5 h-5 text-teal-700" />
              </div>
              <h2 className=" text-normal font-bold text-gray-900">
                Terms & Conditions
              </h2>
            </div> */}

            <div className=" py-6">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Loading...
                </div>
              ) : termsHtml ? (
                <div
                  className=" text-lg text-gray-700 leading-relaxed  mx-auto"
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No content available.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
