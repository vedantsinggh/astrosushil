/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useCallback } from "react";
import PhoneInput from "../../lib/phoneInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import Seo from "../../components/Seo";

const GENDERS = ["Male", "Female", "Other"];
const OTP_LENGTH = 6;
const RESEND_CD = 30;

const EMPTY_FORM = {
  name: "",
  dob: "",
  gender: "Male",
  birthPlace: "",
  birthTime: "",
  phone: "",
  email: "",
};

const EMPTY_ERRORS = {
  name: "",
  dob: "",
  gender: "",
  birthPlace: "",
  birthTime: "",
  phone: "",
  email: "",
};

const validators = {
  name: (v) => {
    if (!v.trim()) return "Name is required.";
    if (v.trim().length < 2) return "Name must be at least 2 characters.";
    if (!/^[a-zA-Z\s'.,-]+$/.test(v))
      return "Name contains invalid characters.";
    return "";
  },
  // dob: (v) => {
  //   if (!v) return ""; // optional
  //   const date = new Date(v);
  //   const now = new Date();
  //   if (isNaN(date)) return "Invalid date.";
  //   if (date > now) return "Date of birth cannot be in the future.";
  //   const age = (now - date) / (365.25 * 24 * 3600 * 1000);
  //   if (age > 120) return "Please enter a valid date of birth.";
  //   return "";
  // },
  gender: () => "", // always valid (select)
  // birthPlace: (v) => {
  //   if (v && v.trim().length < 2) return "Enter a valid place name.";
  //   return "";
  // },
  // birthTime: (v) => {
  //   if (v && !/^\d{2}:\d{2}$/.test(v)) return "Invalid time format.";
  //   return "";
  // },
  phone: (v) => {
    if (!v.trim()) return "Phone number is required.";
    if (!/^\+?[1-9]\d{6,14}$/.test(v.trim()))
      return "Enter a valid phone number (7–15 digits, with optional + country code).";
    return "";
  },
  email: (v) => {
    if (!v.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return "Enter a valid email address.";
    return "";
  },
};

const cardV = {
  hidden: { opacity: 0, x: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
  exit: { opacity: 0, x: -24, scale: 0.97, transition: { duration: 0.3 } },
};

// ─── Shared UI primitives ──────────────────────────────────────────────────────
function FieldWrapper({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-white/55 text-[11px] tracking-widest uppercase font-body">
        {label}
        {required && <span className="text-gold ml-0.5">*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="text-red-400 text-[10px] mt-0.5 leading-tight"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlassInput({ icon: Icon, error, className = "", ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={13}
          className="absolute left-3 top-1/2 mt-1.5 -translate-y-1/2 text-gold/50 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <input
        {...props}
        aria-invalid={!!error}
        className={`
          w-full bg-white/8 border rounded-lg text-white text-sm
          placeholder-white/25 py-2.5 transition-all duration-200
          focus:outline-none focus:bg-white/12
          focus-visible:ring-1
          ${
            error
              ? "border-red-400/60 focus:border-red-400 focus-visible:ring-red-400/40"
              : "border-white/15 focus:border-gold/50 focus-visible:ring-gold/40"
          }
          ${Icon ? "pl-8 pr-3" : "px-3"} ${className}
        `}
      />
    </div>
  );
}

function GlassSelect({ icon: Icon, options, error, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={13}
          className="absolute left-3 top-1/2 mt-1.5 -translate-y-1/2 text-gold/50 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <select
        {...props}
        aria-invalid={!!error}
        className={`
          w-full bg-white/8 border rounded-lg text-white text-sm
          py-2.5 pl-8 pr-8 appearance-none transition-all duration-200
          focus:outline-none focus:bg-white/12
          focus-visible:ring-1
          ${
            error
              ? "border-red-400/60 focus:border-red-400 focus-visible:ring-red-400/40"
              : "border-white/15 focus:border-gold/50 focus-visible:ring-gold/40"
          }
        `}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-primary text-white">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/50 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

function GoldButton({ onClick, disabled, loading, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="
        w-full py-2.5 rounded-xl cursor-pointer font-heading text-sm tracking-widest uppercase
        bg-gradient-gold text-black hover:brightness-110 active:scale-[0.98]
        disabled:opacity-60 disabled:cursor-not-allowed
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60
        flex items-center justify-center gap-2
      "
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}

// ─── OTP input ─────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || "");
  const refs = useRef([]);
  const focus = (i) => refs.current[i]?.focus();

  const handleKey = (e, i) => {
    if (e.key === "Backspace") {
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) focus(i - 1);
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) focus(i - 1);
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) focus(i + 1);
  };

  const handleChange = (e, i) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = val;
    onChange(next.join(""));
    if (val && i < OTP_LENGTH - 1) focus(i + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    onChange(pasted.padEnd(OTP_LENGTH, "").slice(0, OTP_LENGTH));
    focus(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div
      className="flex gap-2 justify-center"
      role="group"
      aria-label="OTP input"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${i + 1}`}
          className="
            w-10 h-12 sm:w-11 text-center text-base font-heading text-white caret-gold
            bg-white/8 border border-white/20 rounded-lg
            focus:outline-none focus:border-gold focus:bg-white/15
            focus-visible:ring-1 focus-visible:ring-gold/50
            transition-all duration-200
          "
        />
      ))}
    </div>
  );
}

// ─── Form step ─────────────────────────────────────────────────────────────────

function FormStep({ form, errors, setField, setPhone, onSubmit, loading }) {
  return (
    <motion.div
      key="form"
      variants={cardV}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-5 sm:p-7 shadow-2xl"
    >
      <div className="mb-5 text-center">
        <h1 className="font-heading text-white text-2xl sm:text-[1.75rem] mb-1">
          Sign Up
        </h1>
        <p className="text-white/45 text-xs sm:text-sm">
          Sign Up to Unlock Your Personalized Astrology Experience
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Name */}
        <div className="col-span-1">
          <FieldWrapper label="Name" required error={errors.name}>
            <GlassInput
              icon={User}
              type="text"
              placeholder="ABC"
              value={form.name}
              onChange={setField("name")}
              error={errors.name}
              autoComplete="name"
              aria-label="Full name"
            />
          </FieldWrapper>
        </div>

        {/* DOB */}
        {/* <div className="col-span-2 sm:col-span-1">
          <FieldWrapper label="Date of Birth" error={errors.dob}>
            <GlassInput
              icon={Calendar}
              type="date"
              value={form.dob}
              onChange={setField("dob")}
              error={errors.dob}
              aria-label="Date of birth"
            />
          </FieldWrapper>
        </div> */}

        {/* Gender */}
        {/* <div className="col-span-2 sm:col-span-1">
          <FieldWrapper label="Gender" error={errors.gender}>
            <GlassSelect
              icon={User}
              options={GENDERS}
              value={form.gender}
              onChange={setField("gender")}
              error={errors.gender}
              aria-label="Gender"
            />
          </FieldWrapper>
        </div> */}

        {/* Birth Place */}
        {/* <div className="col-span-2 sm:col-span-1">
          <FieldWrapper label="Birth Place" error={errors.birthPlace}>
            <GlassInput
              icon={MapPin}
              type="text"
              placeholder="Delhi, India"
              value={form.birthPlace}
              onChange={setField("birthPlace")}
              error={errors.birthPlace}
              aria-label="Birth place"
            />
          </FieldWrapper>
        </div> */}

        {/* Birth Time */}
        {/* <div className="col-span-2 sm:col-span-1">
          <FieldWrapper label="Birth Time" error={errors.birthTime}>
            <GlassInput
              icon={Clock}
              type="time"
              value={form.birthTime}
              onChange={setField("birthTime")}
              error={errors.birthTime}
              aria-label="Birth time"
            />
          </FieldWrapper>
        </div> */}

        {/* Email */}
        <div className="col-span-1">
          <FieldWrapper label="Email" required error={errors.email}>
            <GlassInput
              icon={Mail}
              type="email"
              placeholder="shashank@example.com"
              value={form.email}
              onChange={setField("email")}
              error={errors.email}
              autoComplete="email"
              aria-label="Email address"
            />
          </FieldWrapper>
        </div>

        {/* Phone */}
        <div className="col-span-1">
          <FieldWrapper label="Phone Number" required error={errors.phone}>
            <div className="phone-input-dark">
              <PhoneInput
                country="in"
                value={form.phone.startsWith("+") ? form.phone.slice(1) : form.phone}
                onChange={setPhone}
                enableSearch
                containerStyle={{ width: "100%" }}
                inputStyle={{
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "0.5rem",
                  color: "white",
                  fontSize: "0.875rem",
                  height: "40px",
                  paddingLeft: "50px",
                  fontFamily: "inherit",
                }}
                buttonStyle={{
                  background: "transparent",
                  border: "none",
                  borderRight: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "0.5rem 0 0 0.5rem",
                }}
                dropdownStyle={{
                  background: "#1a1830",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "0.5rem",
                  zIndex: 50,
                }}
                inputProps={{
                  autoComplete: "tel",
                  "aria-label": "Phone number",
                  required: true,
                }}
              />
            </div>
          </FieldWrapper>
        </div>
      </div>

      <div className="mt-5">
        <GoldButton onClick={onSubmit} loading={loading}>
          <span>Submit</span>
          <ArrowRight size={14} aria-hidden="true" />
        </GoldButton>
      </div>

      <Link
  to="/dashboard/"
  className="mt-4 flex items-center justify-center gap-3 bg-primary px-5 py-2 rounded-xl hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
>
  <span className="text-base font-medium text-white">
    Already have an account?
  </span>
  <span className="text-white text-base underline whitespace-nowrap">
    Sign In
  </span>
</Link>
    </motion.div>
  );
}

// ─── OTP step ──────────────────────────────────────────────────────────────────
function OtpStep({
  phone,
  otp,
  setOtp,
  onVerify,
  onResend,
  onBack,
  verifying,
  resending,
  cooldown,
}) {
  return (
    <motion.div
      key="otp"
      variants={cardV}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-6 sm:p-8 shadow-2xl"
    >
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
          <Phone size={26} className="text-gold" aria-hidden="true" />
        </div>
      </div>

      <div className="text-center mb-7">
        <h2 className="font-heading text-white text-2xl sm:text-3xl mb-2">
          Verify OTP
        </h2>
        <p className="text-white/50 text-sm leading-relaxed">
          We sent a {OTP_LENGTH}-digit code
        </p>
      </div>

      <OtpInput value={otp} onChange={setOtp} />

      <div className="mt-6">
        <GoldButton
          onClick={onVerify}
          loading={verifying}
          disabled={otp.length < OTP_LENGTH}
        >
          <span>Verify & Continue</span>
          <ArrowRight size={14} aria-hidden="true" />
        </GoldButton>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || resending}
          className="
            flex items-center gap-1.5 text-xs text-white/45 hover:text-gold
            disabled:text-white/20 disabled:cursor-not-allowed
            transition-colors focus-visible:outline-none focus-visible:ring-1
            focus-visible:ring-gold rounded py-1
          "
        >
          <RotateCcw size={11} aria-hidden="true" />
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : resending
              ? "Sending…"
              : "Resend OTP"}
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="
          mt-2 w-full text-center text-white/30 text-xs hover:text-white/55
          transition-colors focus-visible:outline-none
          focus-visible:ring-1 focus-visible:ring-white/20 rounded py-1
        "
      >
        ← Edit details
      </button>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SignUpPage() {
  const { register, verifyOtp, loading } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [touched, setTouched] = useState({}); // track which fields were touched
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ── onChange + validate immediately ──────────────────────────────────────────
  const setField = useCallback(
    (field) => (e) => {
      const value = e.target.value;

      setForm((f) => ({ ...f, [field]: value }));
      setTouched((t) => ({ ...t, [field]: true }));
      setErrors((err) => ({ ...err, [field]: validators[field](value) }));
    },
    [],
  );

  const setPhone = useCallback((value) => {
    const formatted = "+" + value;
    setForm((f) => ({ ...f, phone: formatted }));
    setTouched((t) => ({ ...t, phone: true }));
    setErrors((err) => ({ ...err, phone: validators.phone(formatted) }));
  }, []);

  // ── Validate all required fields before submit ────────────────────────────────
  const validateAll = useCallback(() => {
    const requiredFields = ["name", "phone", "email"];
    const allFields = Object.keys(validators);

    const newErrors = {};
    let isValid = true;

    allFields.forEach((field) => {
      const msg = validators[field](form[field]);
      newErrors[field] = msg;
      if (msg && requiredFields.includes(field)) isValid = false;
    });

    setErrors(newErrors);
    // Mark all required fields as touched so errors show
    const newTouched = {};
    requiredFields.forEach((f) => (newTouched[f] = true));
    setTouched((t) => ({ ...t, ...newTouched }));

    return isValid;
  }, [form]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = useCallback(async () => {
    if (!validateAll()) return;

    const payload = {
      firstName: form.name,
      email: form.email,
      phoneNumber: form.phone,
      gender: form.gender,
      dob: form.dob || undefined,
      birthTime: form.birthTime || undefined,
      birthPlace: form.birthPlace || undefined,
    };

    const res = await register(payload);
    if (res.success) {
      setStep("otp");
      setCooldown(RESEND_CD);
    }
  }, [form, register, validateAll]);

  const handleVerify = useCallback(async () => {
    if (otp.length < OTP_LENGTH) return;

    setVerifying(true);
    const res = await verifyOtp({ identifier: form.phone, otp, type: "AUTH" });
    setVerifying(false);

    if (res.success) navigate("/");
  }, [otp, form.phone, verifyOtp, navigate]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setResending(true);

    const res = await register({
      firstName: form.name,
      email: form.email,
      phoneNumber: form.phone,
    });
    setResending(false);

    if (res.success) {
      setOtp("");
      setCooldown(RESEND_CD);
    }
  }, [cooldown, form, register]);

  const handleBack = useCallback(() => {
    setStep("form");
    setOtp("");
  }, []);

  // Only show errors for touched fields (unless submit was attempted)
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [k, touched[k] ? v : ""]),
  );

  return (
    <>
      <Seo page="register" />
      <div className="relative min-h-screen w-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://astro-sushil.s3.ap-southeast-2.amazonaws.com/videos/slider.webm"
            type="video/webm"
          />
        </video>

        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-linear-to-r from-black/70 via-black/40 to-black/10"
          aria-hidden="true"
        />

        <div
          className="
          relative z-10 min-h-screen
          flex flex-col lg:flex-row items-center
          justify-center lg:justify-between
          px-5 max-w-7xl mx-auto
          py-10 lg:py-0 gap-10 lg:gap-6
        "
        >
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left shrink-0 lg:flex-1 lg:max-w-sm xl:max-w-md"
          >
            <img
              src="/logo/logo.webp"
              alt="Astro Sushil"
              width={180}
              height={180}
              className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 object-contain drop-shadow-2xl"
            />
          </motion.div>

          <div className="w-full lg:flex-1 lg:max-w-md xl:max-w-lg flex justify-center lg:justify-end">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <FormStep
                  form={form}
                  errors={visibleErrors}
                  setField={setField}
                  setPhone={setPhone}
                  onSubmit={handleSubmit}
                  loading={loading}
                />
              )}
              {step === "otp" && (
                <OtpStep
                  phone={form.phone}
                  otp={otp}
                  setOtp={setOtp}
                  onVerify={handleVerify}
                  onResend={handleResend}
                  onBack={handleBack}
                  verifying={verifying}
                  resending={resending}
                  cooldown={cooldown}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
