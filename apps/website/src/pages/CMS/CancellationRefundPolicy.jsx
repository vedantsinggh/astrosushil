/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { useSettingStore } from "../../store/usSettingStore";
import Seo from "../../components/Seo";
import PageHero from "../../components/HeroPage";

export default function CancellationRefundPolicy() {
  const { settings, fetchSettings } = useSettingStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const contactEmail = settings?.contact?.email || "support@astrosushil.com";

  return (
    <>
      <Seo page="cancellation" />

      <PageHero
        title="Cancellation & No-Refund Policy"
        highlight="No-Refund Policy"
        subtitle="All consultations, personalized reports, courses, digital downloads, and products purchased on Astro Sushil are strictly non-refundable."
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Cancellation & No-Refund Policy",
            href: "/cancellation-refund-policy",
          },
        ]}
      />

      <div className="min-h-max bg-[#f5f7f6]">
        <div className="max-w-5xl mx-auto px-5 py-10 space-y-6">
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed"
          >
            <div className="border-b border-gray-100 pb-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Effective Date: November 26, 2026 &bull; Website, iOS &amp; Android
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Please read this Cancellation &amp; No-Refund Policy carefully before placing any order or booking a consultation on the <strong>Astro Sushil</strong> Website, iOS App, or Android App.
              </p>
            </div>

            <section className="space-y-2 bg-red-50/60 border border-red-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-xl font-bold text-gray-900">1. Strict No-Refund Policy (All Offerings)</h2>
              <p className="text-sm sm:text-base text-gray-800">
                <strong>All sales and bookings on Astro Sushil are final and strictly non-refundable.</strong> Once payment is completed, no full or partial refund will be issued under any circumstances for:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base text-gray-800">
                <li>1-on-1 Audio, Video, In-Person, or WhatsApp Message Consultations</li>
                <li>Personalized Vedic / Gupta Nadi PDF Reports &amp; Match-Making Reports</li>
                <li>Online Astrology Courses &amp; Digital Downloads</li>
                <li>Physical &amp; Consecrated Spiritual Products</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">2. Consultations: Cancellation &amp; Rescheduling</h2>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
                <li>
                  <strong>No Client Rescheduling:</strong> Clients cannot reschedule a booked consultation slot. Rescheduling is strictly an administrative action and may only be performed by an authorized Astro Sushil administrator at management&apos;s sole discretion.
                </li>
                <li>
                  <strong>Cancellations &amp; No-Shows:</strong> Cancelling a booking or failing to attend the scheduled session (No-Show) frees the slot but does <strong>not</strong> entitle the customer to any refund.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">3. Personalized PDF Reports &amp; Technical Issues</h2>
              <p className="text-sm sm:text-base">
                Personalized PDF reports are custom-compiled for your specific birth details and are non-refundable. In the rare event of a technical failure during generation, Astro Sushil will regenerate and deliver your report at no additional cost.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">4. Duplicate / Failed Payment Reconciliation</h2>
              <p className="text-sm sm:text-base">
                If an amount is debited from your bank/UPI/card due to a payment gateway failure without order creation, the payment gateway (Razorpay) automatically settles or reverses failed authorizations per banking timelines. For genuine duplicate debits for the exact same order, contact{" "}
                <a href={`mailto:${contactEmail}`} className="text-primary font-semibold underline">
                  {contactEmail}
                </a>{" "}
                with your transaction reference.
              </p>
            </section>

            <section className="space-y-2 bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-lg font-bold text-gray-900">5. Governing Law &amp; Exclusive Ayodhya Court Jurisdiction</h2>
              <p className="text-sm sm:text-base text-gray-800">
                Every dispute, claim, or legal matter concerning any consultation, personalized report, product, payment, or refund request on the Website, iOS App, or Android App shall be governed by Indian law and{" "}
                <strong>
                  judged exclusively by the competent courts in Ayodhya, Uttar Pradesh, India
                </strong>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
