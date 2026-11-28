/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { useSettingStore } from "../../store/usSettingStore";
import Seo from "../../components/Seo";
import PageHero from "../../components/HeroPage";

export default function PrivacyPolicy() {
  const { settings, fetchSettings } = useSettingStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const contactEmail = settings?.contact?.email || "support@astrosushil.com";

  return (
    <>
      <Seo page="privacy-policy" />

      <PageHero
        title="Privacy Policy"
        highlight="Policy"
        subtitle="How Astro Sushil Private Limited collects, processes, stores, and protects your personal and birth data across our Website, iOS App, and Android App."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy Policy", href: "/privacy-policy" },
        ]}
      />

      <div className="min-h-screen bg-[#f5f7f6]">
        <div className="max-w-5xl mx-auto px-5 py-10 space-y-6">
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed"
          >
            <div className="border-b border-gray-100 pb-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                Effective Date: November 26, 2026 &bull; Applies to Website, iOS &amp; Android
              </p>
              <p className="mt-2 text-sm text-gray-600">
                This Privacy Policy governs the collection, use, storage, and disclosure of personal data by{" "}
                <strong>Astro Sushil Private Limited</strong> (&ldquo;Astro Sushil&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) across our website (
                <span className="font-medium">astrosushil.com</span>), our iOS mobile application, and our Android mobile application (collectively, the &ldquo;Platform&rdquo;), in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act), the Information Technology Act, 2000, and applicable Apple App Store and Google Play Store data safety requirements.
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">1. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
                <li>
                  <strong>Account &amp; Identity Data:</strong> Full name, email address, mobile phone number (in E.164 format for OTP authentication), gender, and encrypted authentication credentials.
                </li>
                <li>
                  <strong>Birth &amp; Astrological Profile Data:</strong> Date of birth, exact birth time, place of birth, timezone, and geographical coordinates (latitude/longitude) for you and any saved family or match-making profiles.
                </li>
                <li>
                  <strong>Consultation &amp; Order Data:</strong> Booking history, consultation mode (audio, video, in-person, or WhatsApp message), queries submitted for consultation, personalized PDF reports, and shipping addresses for physical products.
                </li>
                <li>
                  <strong>Payment &amp; Billing Data:</strong> Transaction IDs, Razorpay payment references, billing details, and GST invoice records. We do <strong>not</strong> store raw credit/debit card numbers, CVV, or UPI PINs on our servers.
                </li>
                <li>
                  <strong>Device &amp; App Data (iOS &amp; Android):</strong> Device model, OS version, app version, push notification tokens (FCM/APNs), IP address for rate-limiting and fraud prevention, and crash/diagnostic logs. We do not use third-party advertising trackers or sell your personal data.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
                <li>To perform deterministic Vedic astrology, Brihaspati Nandi Nadi (BNN), and ephemeris calculations and generate personalized reports.</li>
                <li>To authenticate your account via OTP (SMS, WhatsApp, or Email) and secure your sessions.</li>
                <li>To schedule and deliver consultations, dispatch physical/digital orders, and issue GST-compliant invoices.</li>
                <li>To send transactional notifications (OTP, order confirmations, report-ready alerts, and consultation reminders) via Email, WhatsApp, SMS, and mobile push notifications.</li>
                <li>To prevent fraud, enforce rate limits, maintain audit logs, and comply with Indian legal and tax obligations.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">3. Mobile App Permissions (iOS &amp; Android)</h2>
              <p className="text-sm sm:text-base">
                Our iOS and Android apps request only essential permissions:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
                <li><strong>Notifications:</strong> To deliver report-ready alerts, consultation reminders, and order updates (optional; manageable in device settings).</li>
                <li><strong>Storage / Files:</strong> Solely when you choose to download or save your generated PDF reports or GST invoices to your device.</li>
                <li><strong>Network Access:</strong> Required to communicate securely over HTTPS/TLS with Astro Sushil servers.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">4. Data Sharing &amp; Third-Party Processors</h2>
              <p className="text-sm sm:text-base">
                We <strong>never sell, rent, or trade</strong> your personal or birth data. Data is shared strictly on a need-to-know basis with vetted infrastructure partners:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-base">
                <li><strong>Payment Gateways:</strong> Razorpay for secure payment processing.</li>
                <li><strong>Messaging &amp; Delivery Providers:</strong> SMS, WhatsApp, and SMTP email providers solely for OTPs and transactional service updates, and courier partners for physical order delivery.</li>
                <li><strong>Legal Authorities:</strong> When required by applicable Indian law, court order, or statutory tax/regulatory authority.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">5. Data Security &amp; Retention</h2>
              <p className="text-sm sm:text-base">
                All communications across Website, iOS, and Android are encrypted in transit using TLS 1.3/HTTPS. Passwords are hashed using industry-standard algorithms, and sensitive secrets (OTPs, passwords, tokens) are strictly redacted from server logs. Transactional and GST invoice records are retained as mandated by Indian tax and corporate law.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">6. Your Rights &amp; Account Deletion</h2>
              <p className="text-sm sm:text-base">
                Under the DPDP Act, 2023, you may access, update, or request deletion of your personal data and saved birth profiles through your account settings or by writing to{" "}
                <a href={`mailto:${contactEmail}`} className="text-primary font-semibold underline">
                  {contactEmail}
                </a>
                . Note that statutory financial/invoice records may be retained where required by law.
              </p>
            </section>

            <section className="space-y-2 bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-lg font-bold text-gray-900">7. Strictly No-Refund Policy &amp; Exclusive Ayodhya Jurisdiction</h2>
              <p className="text-sm sm:text-base text-gray-800">
                All purchases of consultations, personalized reports, courses, and products on the Website, iOS App, and Android App are subject to our strict <strong>No-Refund Policy</strong>. Any dispute, claim, or legal proceeding arising out of or relating to this Privacy Policy, your data, consultations, reports, or any service shall be governed by the laws of India and{" "}
                <strong>subject to the exclusive jurisdiction of the competent courts in Ayodhya, Uttar Pradesh, India</strong>.
              </p>
            </section>

            <section className="space-y-1 text-sm text-gray-600 pt-2 border-t border-gray-100">
              <p><strong>Grievance &amp; Data Protection Contact:</strong> Astro Sushil Private Limited, Ayodhya, Uttar Pradesh, India</p>
              <p>
                Email:{" "}
                <a href={`mailto:${contactEmail}`} className="text-primary font-semibold underline">
                  {contactEmail}
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
