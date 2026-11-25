/* eslint-disable no-unused-vars */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, ArrowRight, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import Seo from "../../components/Seo";
import PhoneInput from "../../lib/phoneInput";

const OTP_LENGTH = 6;
const RESEND_CD = 30;
// Phone OTP login is temporarily disabled; flip to re-enable.
const PHONE_LOGIN_ENABLED = true;

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

function GlassInput({ icon: Icon, className = "", ...props }) {
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
        className={`
          w-full bg-white/8 border border-white/15 rounded-lg text-white text-sm
          placeholder-white/25 py-2.5 transition-all duration-200
          focus:outline-none focus:border-gold/50 focus:bg-white/12
          focus-visible:ring-1 focus-visible:ring-gold/40
          ${Icon ? "pl-8 pr-3" : "px-3"} ${className}
        `}
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
        w-full py-2.5 rounded-xl font-heading text-sm tracking-widest uppercase
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


function LoginStep({ identifier, setIdentifier, onSubmit, loading }) {
  const [mode, setMode] = useState("phone");

  const switchMode = (m) => {
    if (m === "phone" && !PHONE_LOGIN_ENABLED) return;
    setMode(m);
    setIdentifier("");
  };

  return (
    <motion.div
      key="login"
      variants={cardV}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl p-5 sm:p-7 shadow-2xl"
    >
      <div className="mb-6 text-center">
        <h1 className="font-heading text-white text-2xl sm:text-[1.75rem] mb-1">
          Sign In
        </h1>
        <p className="text-white/45 text-xs sm:text-sm">
          Enter your {PHONE_LOGIN_ENABLED ? "phone or " : ""}email to receive an OTP
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 bg-white/8 border border-white/12 rounded-xl p-1">
        {[
          { key: "phone", label: "Phone", Icon: Phone, disabled: !PHONE_LOGIN_ENABLED },
          { key: "email", label: "Email", Icon: Mail, disabled: false },
        ].map(({ key, label, Icon, disabled }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchMode(key)}
            disabled={disabled}
            title={disabled ? "Coming soon" : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === key
                ? "bg-gold text-black"
                : disabled
                  ? "text-white/25 cursor-not-allowed"
                  : "text-white/50 hover:text-white"
            }`}
          >
            <Icon size={12} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-white/55 text-[11px] tracking-widest uppercase font-body">
          {mode === "phone" ? "Phone Number" : "Email Address"}{" "}
          <span className="text-gold">*</span>
        </label>

        {mode === "phone" ? (
          <div className="phone-input-dark">
            <PhoneInput
              country="in"
              value={identifier.startsWith("+") ? identifier.slice(1) : identifier}
              onChange={(value) => setIdentifier("+" + value)}
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
                placeholder: "Phone number",
              }}
            />
          </div>
        ) : (
          <GlassInput
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="email"
            inputMode="email"
            aria-label="Email address"
          />
        )}
      </div>

      <div className="mt-6">
        <GoldButton
          onClick={onSubmit}
          loading={loading}
          disabled={!identifier.trim()}
        >
          <span>Send OTP</span>
          <ArrowRight size={14} aria-hidden="true" />
        </GoldButton>
      </div>

     <Link
  to="/register/"
  className="mt-4 flex items-center justify-center gap-3 bg-primary px-5 py-2 rounded-xl hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
>
  <span className="text-base font-medium text-white">
    Create Account - 
  </span>
  <span className="text-white underline font-medium text-base whitespace-nowrap hover:text-gold">
   Sign Up
  </span>
</Link>
    </motion.div>
  );
}

function OtpStep({
  identifier,
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
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="text-gold font-medium">{identifier}</span>
        </p>
      </div>

      <OtpInput value={otp} onChange={setOtp} />

      <div className="mt-6">
        <GoldButton
          onClick={onVerify}
          loading={verifying}
          disabled={otp.length < OTP_LENGTH}
        >
          <span>Verify & Sign In</span>
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

export default function LoginPage() {
  const { login, verifyOtp, loading } = useAuthStore();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState("login");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendOtp = useCallback(async () => {
    const res = await login({ identifier: identifier.trim() });
    if (res.success) {
      setStep("otp");
      setCooldown(RESEND_CD);
    }
  }, [identifier, login]);

  const handleVerify = useCallback(async () => {
    if (otp.length < OTP_LENGTH) return;
    setVerifying(true);
    const res = await verifyOtp({
      identifier: identifier.trim(),
      otp,
      type: "AUTH",
    });
    setVerifying(false);
    if (res.success) {
      navigate("/");
    }
  }, [otp, identifier, verifyOtp, navigate]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setResending(true);
    const res = await login({ identifier: identifier.trim() });
    setResending(false);
    if (res.success) {
      setOtp("");
      setCooldown(RESEND_CD);
    }
  }, [cooldown, identifier, login]);

  const handleBack = useCallback(() => {
    setStep("login");
    setOtp("");
  }, []);

  return (
    <>
      <Seo page="dashboard" />
      <div className="relative min-h-screen w-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
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
        relative z-10 min-h-screen max-w-7xl mx-auto
        flex flex-col lg:flex-row items-center
        justify-center lg:justify-between px-5
        py-10 lg:py-0 gap-10 lg:gap-6
      "
        >
          {/* Left: logo */}
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

          {/* Right: step card */}
          <div className="w-full lg:flex-1 lg:max-w-md xl:max-w-lg flex justify-center lg:justify-end">
            <AnimatePresence mode="wait">
              {step === "login" && (
                <LoginStep
                  identifier={identifier}
                  setIdentifier={setIdentifier}
                  onSubmit={handleSendOtp}
                  loading={loading}
                />
              )}
              {step === "otp" && (
                <OtpStep
                  identifier={identifier}
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
