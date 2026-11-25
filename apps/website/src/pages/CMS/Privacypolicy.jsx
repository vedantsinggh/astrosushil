/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Bell,
  Trash2,
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

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { settings, fetchSettings, loading } = useSettingStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const privacyHtml = settings?.legal?.privacyPolicy;
  const contactEmail = settings?.contact?.email || "privacy@astrosushil.com";

  return (
    <>
      <Seo page="privacy-policy" />

      <PageHero
        title="Privacy Policy"
        highlight="Policy"
        subtitle="Learn how we collect, use, store, and protect your personal information while using Astro Sushil's website and services."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy Policy", href: "/privacy-policy" },
        ]}
      />

      <div className="min-h-screen bg-[#f5f7f6]">
        <div className="max-w-7xl mx-auto px-5 py-10 space-y-6">
          {/* hero */}
          {/* <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-8 flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Shield className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Your Privacy Matters
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
                We are committed to protecting your personal information. This
                policy explains what we collect, how we use it, and the choices
                you have.
              </p>
            </div>
          </motion.div> */}

          {/* API content */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="overflow-hidden"
          >
            {/* <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 bg-teal-50/40">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-700" />
              </div>
              <h2 className="font-bold text-gray-900 ">Privacy Policy</h2>
            </div> */}

            <div className=" py-6">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Loading...
                </div>
              ) : privacyHtml ? (
                <div
                  className=" text-lg text-gray-700 leading-relaxed  mx-auto"
                  dangerouslySetInnerHTML={{ __html: privacyHtml }}
                />
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No content available.
                </p>
              )}
            </div>
          </motion.div>

          {/* <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className=" bg-primary rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Privacy Questions?</p>
                <p className="text-teal-100 text-xs">
                  Contact our Data Protection Officer
                </p>
              </div>
            </div>
            <a
              href={`mailto:${contactEmail}`}
              className="px-5 py-2.5 bg-secondary text-primary rounded-full text-sm font-bold hover:bg-teal-50 transition-colors shadow-md"
            >
              {contactEmail}
            </a>
          </motion.div> */}
        </div>
      </div>
    </>
  );
}
