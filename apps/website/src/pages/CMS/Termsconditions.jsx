/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useSettingStore } from "../../store/usSettingStore";
import Seo from "../../components/Seo";
import PageHero from "../../components/HeroPage";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function TermsConditions() {
  const { settings, fetchSettings } = useSettingStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const contactEmail = settings?.contact?.email || "support@astrosushil.com";

  return (
    <>
      <Seo page="terms" />

      <PageHero
        title="Terms & Conditions"
        highlight="Conditions"
        subtitle="Legal terms governing your use of Astro Sushil's Website, iOS App, Android App, consultations, personalized reports, courses, and products."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Terms & Conditions", href: "/terms-conditions" },
        ]}
      />

      <div className="min-h-screen bg-[#f5f7f6]">
        <div className="max-w-5xl mx-auto px-5 py-10 space-y-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed"
          >
            <div className="border-b border-gray-100 pb-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Effective Date: November 26, 2026 &bull; Website, iOS &amp; Android
              </p>
              <p className="mt-2 text-sm text-gray-600">
                By accessing or using the <strong>Astro Sushil</strong> website (<span className="font-medium">astrosushil.com</span>), iOS application, or Android application operated by <strong>Astro Sushil Private Limited</strong>, you unconditionally agree to be bound by these Terms &amp; Conditions. If you do not agree, please discontinue use immediately.
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">1. Scope &amp; Nature of Astrological Services</h2>
              <p className="text-sm sm:text-base">
                All Vedic astrology charts, Brihaspati Nandi Nadi (BNN) / Gupta Nadi analyses, personalized PDF reports, consultations, and educational courses are provided strictly for spiritual, cultural, and personal self-reflection purposes. They do not constitute medical, legal, psychological, or financial advice, and no guarantee of specific outcomes is implied.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">2. Strict No-Refund Policy</h2>
              <p className="text-sm sm:text-base font-medium text-gray-900">
                All payments made on the Website, iOS App, and Android App are 100% final and strictly non-refundable.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
                <li>No refunds are issued for 1-on-1 consultations, WhatsApp message consultations, personalized PDF reports, digital products, courses, or physical/consecrated items once an order or booking is confirmed.</li>
                <li>Missed consultations (no-shows), late arrivals, or client-initiated cancellations do not qualify for any refund or credit.</li>
                <li>If a technical error prevents report generation, Astro Sushil will regenerate and deliver the report at no additional charge.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">3. Consultation Rescheduling Policy (Admin Only)</h2>
              <p className="text-sm sm:text-base">
                Clients <strong>cannot reschedule</strong> consultations from the Website, iOS App, or Android App. Rescheduling may only be performed by an authorized Astro Sushil administrator in exceptional circumstances at management&apos;s sole discretion.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">4. Accuracy of Birth Details &amp; User Conduct</h2>
              <p className="text-sm sm:text-base">
                You are solely responsible for providing accurate birth date, time, and place details. Astro Sushil is not liable for inaccurate readings or reports resulting from incorrect input data. Users must maintain respectful conduct during consultations; abusive behaviour will result in immediate termination of the session without refund.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">5. Intellectual Property Rights</h2>
              <p className="text-sm sm:text-base">
                All PDF reports, course videos, text, astrological methodologies, trademarks, graphics, and software across the Website, iOS App, and Android App are the exclusive intellectual property of Astro Sushil Private Limited. Recording, reproducing, redistributing, or reselling any content is strictly prohibited and actionable under Indian law.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">6. Limitation of Liability</h2>
              <p className="text-sm sm:text-base">
                To the maximum extent permitted by applicable law, Astro Sushil Private Limited, its directors, astrologers, and staff shall not be liable for any indirect, incidental, consequential, or special damages arising out of your use of any consultation, report, product, or platform feature. In any event, total liability shall not exceed the amount actually paid by you for the specific transaction giving rise to the claim.
              </p>
            </section>

            <section className="space-y-2 bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-lg font-bold text-gray-900">7. Governing Law &amp; Exclusive Ayodhya Court Jurisdiction</h2>
              <p className="text-sm sm:text-base text-gray-800">
                These Terms &amp; Conditions shall be governed by and construed in accordance with the laws of the Republic of India.{" "}
                <strong>
                  Every dispute, claim, suit, or legal proceeding regarding any consultation, personalized report, product, course, payment, or anything arising out of or relating to Astro Sushil (across Website, iOS, and Android) shall be judged exclusively by the competent courts in Ayodhya, Uttar Pradesh, India.
                </strong>{" "}
                You irrevocably submit to the exclusive jurisdiction of the courts at Ayodhya, Uttar Pradesh.
              </p>
            </section>

            <section className="space-y-1 text-sm text-gray-600 pt-2 border-t border-gray-100">
              <p><strong>Legal &amp; Support Contact:</strong> Astro Sushil Private Limited, Ayodhya, Uttar Pradesh, India</p>
              <p>
                Email:{" "}
                <a href={`mailto:${contactEmail}`} className="text-primary font-semibold underline">
                  {contactEmail}
                </a>
              </p>
            </section>
          </motion.div>
        </div>
      </div>
    </>
  );
}
