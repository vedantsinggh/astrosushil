/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// ShippingDeliveryPolicy.jsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";

import { Truck, Package, Clock, MapPin, Mail, Phone } from "lucide-react";
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

export default function ShippingDeliveryPolicy() {
  const { settings, fetchSettings, loading } = useSettingStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const shippingHtml = settings?.legal?.shippingDeliveryPolicy;
  const contactEmail = settings?.contact?.email || "connect@astrosushil.com";
  const contactPhone = settings?.contact?.phone || "";
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold;
  const baseDeliveryCharge = settings?.shipping?.baseDeliveryCharge;
  const returnPolicyDays = settings?.order?.returnPolicyDays;
  const supportedAreas = settings?.shipping?.supportedAreas || [];

  const highlights = [
    {
      icon: Package,
      label: "Free Shipping",
      desc: freeShippingThreshold
        ? `On orders above ₹${freeShippingThreshold}`
        : "On eligible orders",
    },
    {
      icon: Truck,
      label: "Delivery Charge",
      desc: baseDeliveryCharge
        ? `₹${baseDeliveryCharge} base charge`
        : "As applicable",
    },
    {
      icon: Clock,
      label: "Return Window",
      desc: returnPolicyDays
        ? `${returnPolicyDays} days return policy`
        : "As per policy",
    },
    {
      icon: MapPin,
      label: "Supported Areas",
      desc: supportedAreas.length
        ? supportedAreas.join(", ")
        : "Selected locations",
    },
  ];

  return (
    <>
      <Seo page="shipping" />

      <PageHero
        title="Shipping & Delivery Policy"
        highlight="Delivery Policy"
        subtitle="Find complete information about order processing, shipping timelines, digital downloads, physical product delivery, and customer support."
        breadcrumbs={[
          { label: "Home", href: "/" },
          {
            label: "Shipping & Delivery Policy",
            href: "/shipping-delivery-policy",
          },
        ]}
      />

      <div className="min-h-max bg-[#f5f7f6]">
        <div className="max-w-7xl mx-auto px-5 py-10 space-y-6">
          {/* <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-8 flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Truck className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Shipping & Delivery Policy
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
                Everything you need to know about how we deliver our products
                and services to you.
              </p>
            </div>
          </motion.div> */}

          {/* <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {highlights.map(({ icon: Icon, label, desc }, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">{label}</p>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </motion.div> */}

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="overflow-hidden"
          >
            {/* <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-teal-50/40">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-teal-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Shipping & Delivery Details
              </h2>
            </div> */}

            <div className="py-6">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  Loading...
                </div>
              ) : shippingHtml ? (
                <div
                  className="text-lg"
                  dangerouslySetInnerHTML={{ __html: shippingHtml }}
                />
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No content available.
                </p>
              )}
            </div>
          </motion.div>

          {/* contact strip */}
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
                <p className="font-bold text-sm">Shipping Queries?</p>
                <p className="text-teal-100 text-xs">
                  Get in touch with our support team
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="px-4 py-2.5 bg-white/15 border border-white/25 text-white rounded-full text-sm font-semibold hover:bg-white/25 transition-colors flex items-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {contactPhone}
                </a>
              )}
              <a
                href={`mailto:${contactEmail}`}
                className="px-5 py-2.5 bg-secondary text-primary rounded-full text-sm font-bold hover:bg-teal-50 transition-colors shadow-md"
              >
                {contactEmail}
              </a>
            </div>
          </motion.div> */}
        </div>
      </div>
    </>
  );
}
