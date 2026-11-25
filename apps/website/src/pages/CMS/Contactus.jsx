/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  PhoneCall,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSettingStore } from "../../store/usSettingStore"; // adjust path
import PageHero from "../../components/HeroPage"; // adjust path
import Seo from "../../components/Seo";
import PhoneInput from "../../lib/phoneInput";


const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-body font-medium text-black/40 uppercase tracking-widest">
      {label}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 font-body">{error}</p>}
  </div>
);

const iCls =
  "w-full px-4 py-3 rounded-md border border-black/10 bg-gray-50 text-sm font-body text-black placeholder:text-black/30 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all";

const EMPTY = { name: "", email: "", phone: "", message: "" };

export default function ContactUs() {
  const navigate = useNavigate();
  const { createInquiry, loading, fetchSettings, settings } = useSettingStore();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  useEffect(() => {
    const loadSettings = async () => {
      await fetchSettings();
      setSettingsLoaded(true);
    };

    loadSettings();
  }, []);
  const CONTACT_CARDS = React.useMemo(
    () =>
      [
        settings?.contact?.phone && {
          icon: PhoneCall,
          title: "Have Any Question?",
          value: `+91-${settings.contact.phone}`,
          sub: settings.contact.whatsapp
            ? `+91-${settings.contact.whatsapp}`
            : null,
          href: `tel:+91${settings.contact.phone}`,
        },
        settings?.contact?.email && {
          icon: Mail,
          title: "Mail Us",
          value: settings.contact.email,
          sub: null,
          href: `mailto:${settings.contact.email}`,
        },
        settings?.contact?.address && {
          icon: MapPin,
          title: "Our Office",
          value: settings.contact.address.trim(),
          sub: null,
          href: `https://maps.google.com/?q=${encodeURIComponent(settings.contact.address)}`,
        },
      ].filter(Boolean),
    [settings],
  );

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim() || !/^\+?[0-9\s-]{7,15}$/.test(form.phone))
      e.phone = "Valid phone number required";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required";
    if (!form.message.trim()) e.message = "Message is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const result = await createInquiry({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      subject: "Contact Form",
      message: form.message.trim(),
      source: "contact",
    });

    if (result.success) {
      toast.success("Message sent successfully!");
      navigate("/contact-us/thank-you");
    } else {
      toast.error(
        typeof result.error.message === "string"
          ? result.error.message
          : "Something went wrong",
      );
    }
  };

  return (
    <>
      <Seo page="contact-us" />
      <PageHero
        title="Get in Touch with Astro Sushil"
        highlight="Contact"
        subtitle="Need guidance or want to book a consultation? Reach out to our team for appointments, support, product enquiries, or any astrology-related assistance. We are here to help."
        image="/Image/page-hero-bg.webp"
        align="center"
        breadcrumbs={[{ label: "Contact", href: "/contact" }]}
      />

      <main className="w-full bg-white">
        {/* ── Section: Form + Info ── */}
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20 py-12 sm:py-16">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start"
          >
            {/* LEFT — Form */}
            <motion.div variants={fadeUp}>
              {/* Section label */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-gold text-sm font-body uppercase tracking-[0.18em]">
                  Send Us E-Mail
                </span>
                <span className="h-px w-8 bg-gold" />
              </div>
              <h2 className="font-heading text-primary text-3xl sm:text-4xl mb-8 leading-snug">
                Feel Free To Write
              </h2>

              <AnimatePresence mode="wait">
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* Name + Email row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* <Field label="Enter Name" error={errors.name}> */}
                      <input
                        className={iCls}
                        placeholder="Your full name"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                      />
                      {/* </Field> */}
                      {/* <Field
                        label="Enter Email (Optional)"
                        error={errors.email}
                      > */}
                      <input
                        className={iCls}
                        type="email"
                        placeholder="you@email.com (optional)"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                      />
                      {/* </Field> */}
                    </div>

                    {/* Phone */}
                    <PhoneInput
                      country="in"
                      value={form.phone.startsWith("+") ? form.phone.slice(1) : form.phone}
                      onChange={(value) => {
                        setField("phone", "+" + value);
                      }}
                      enableSearch
                      containerStyle={{ width: "100%" }}
                      inputStyle={{
                        width: "100%",
                        background: errors.phone ? "#fef2f2" : "#f9fafb",
                        border: errors.phone ? "1px solid #f87171" : "1px solid rgba(0,0,0,0.10)",
                        borderRadius: "0.375rem",
                        color: "black",
                        fontSize: "0.875rem",
                        height: "46px",
                        paddingLeft: "50px",
                        fontFamily: "inherit",
                      }}
                      buttonStyle={{
                        background: errors.phone ? "#fef2f2" : "#f9fafb",
                        border: "none",
                        borderRight: errors.phone ? "1px solid #f87171" : "1px solid rgba(0,0,0,0.10)",
                        borderRadius: "0.375rem 0 0 0.375rem",
                      }}
                      dropdownStyle={{
                        background: "white",
                        color: "black",
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: "0.5rem",
                        zIndex: 50,
                      }}
                      inputProps={{
                        autoComplete: "tel",
                        placeholder: "Phone number",
                      }}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 font-body">{errors.phone}</p>
                    )}

                    {/* Message */}
                    {/* <Field label="Message" error={errors.message}> */}
                    <textarea
                      className={`${iCls} resize-none h-32`}
                      placeholder="Write your message here…"
                      value={form.message}
                      onChange={(e) => setField("message", e.target.value)}
                    />
                    {/* </Field> */}

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      disabled={loading}
                      className="px-8 py-3 rounded-md bg-primary hover:bg-gold text-white font-heading text-sm tracking-widest uppercase flex items-center gap-2 disabled:opacity-60 transition-all duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                        </>
                      ) : (
                        <>
                          {/* <Send className="w-4 h-4" />  */}
                          Submit
                        </>
                      )}
                    </motion.button>
                  </motion.div>
              </AnimatePresence>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gold text-sm font-body uppercase tracking-[0.18em]">
                    Need Any Help?
                  </span>
                  <span className="h-px w-8 bg-gold" />
                </div>
                <h2 className="font-heading text-primary text-3xl sm:text-4xl leading-snug mb-3">
                  Get In Touch With Us
                </h2>
                <p className="text-black/80 text-base font-body leading-relaxed">
                  Have Questions About Astrology Services, Consultations, Or
                  Courses? We're Here To Assist You. Feel Free To Reach Out
                  Using The Details Below.
                </p>
              </div>

              {/* Contact cards */}
              <div className="flex flex-col gap-4">
                {CONTACT_CARDS.map(
                  ({ icon: Icon, title, value, sub, href }, i) => (
                    <a
                      key={i}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      variants={fadeUp}
                      className="flex items-center gap-4 rounded-2xl bg-white transition-all duration-200 group"
                    >
                      {/* Icon circle */}
                      <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center shrink-0 group-hover:bg-gold transition-colors duration-700">
                        <Icon size={20} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-body font-semibold text-primary tracking-wider mb-0.5">
                          {title}
                        </p>
                        <p className="text-black/70 font-heading text-sm leading-snug truncate">
                          {value} {sub && <span className="ml-5">{sub}</span>}
                        </p>
                      </div>
                    </a>
                  ),
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Section: Map ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full border-t border-black/8"
        >
          {/* Map label bar */}
          <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 xl:px-20 pt-10 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-gold text-xs font-body uppercase tracking-[0.18em]">
                Find Us
              </span>
              <span className="h-px w-8 bg-gold" />
            </div>
            <h3 className="font-heading text-primary text-2xl">Our Location</h3>
          </div>

          {/* Google Map iframe */}
          <div className="w-full h-95 sm:h-110">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d448394.27304837183!2d77.390346!3d28.597369!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cef9d2b2754f3%3A0x4a76ba1f8197ee60!2sCleo%20County!5e0!3m2!1sen!2sus!4v1776931571951!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </motion.div>
      </main>
    </>
  );
}
