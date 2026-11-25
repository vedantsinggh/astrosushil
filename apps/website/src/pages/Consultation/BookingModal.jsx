// BookingModal.jsx
/* eslint-disable no-unused-vars */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Shield,
  Check,
  Loader2,
} from "lucide-react";
import { useConsultationStore } from "../../store/useConsultationStore";
import { useAuthStore } from "../../store/useAuthStore";
import MiniCalendar from "./MiniCalendar";
import { MODE_LABELS, fmt } from "./Consultationconstants";
import { useCurrency } from "../../hooks/useCurrency";
import { trackPurchase } from "../../utils/analytics";
import PhoneInput from "../../lib/phoneInput";

const STEPS = ["Date & Slot", "Your Details", "Confirm"];

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-0 px-5 sm:px-6 py-3 border-b border-black/5 shrink-0">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const current = step === num;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-body transition-all duration-300
                  ${done ? "bg-green-500 text-white" : current ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-secondary/40 text-black/30"}`}
              >
                {done ? <Check size={11} /> : num}
              </div>
              <span
                className={`text-[11px] font-body hidden sm:block transition-colors ${current ? "text-primary font-semibold" : "text-black/35"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 transition-colors ${done ? "bg-green-300" : "bg-black/8"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1({
  consultation,
  selectedDate,
  selectedSlot,
  setSelectedSlot,
  onDateSelect,
  displaySlots,
  loading,
  slotMessage,
  blockedDates,
}) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="p-5 sm:p-6 space-y-5"
    >
      <div>
        <p className="text-xs font-body font-semibold text-black/40 uppercase tracking-widest mb-3">
          Select Date
        </p>
        <MiniCalendar
          selected={selectedDate}
          onSelect={onDateSelect}
          blockedDates={blockedDates}
        />
      </div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-body font-semibold text-black/40 uppercase tracking-widest mb-3">
            Available Slots (IST) —{" "}
            {selectedDate.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={22} className="animate-spin text-primary/40" />
            </div>
          ) : slotMessage && displaySlots.length === 0 ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Clock size={14} className="text-amber-500 shrink-0" />
              <p className="text-xs font-body text-amber-700">{slotMessage}</p>
            </div>
          ) : displaySlots.length === 0 ? (
            <p className="text-sm text-black/40 font-body text-center py-4">
              No slots available for this date.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {displaySlots.map((slot, i) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-1 cursor-pointer rounded-xl text-xs font-body font-semibold border transition-all duration-150 text-center
                      ${
                        isSelected
                          ? "border-gold bg-gold text-white shadow-sm shadow-primary/25"
                          : "border-black/10 text-black/60 bg-white hover:border-primary/40 hover:text-primary"
                      }`}
                  >
                    {slot.startTime}{" "}
                    <span className="text-[10px]">– {slot.endTime}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-black/40 font-body mt-2 text-center">
            The slots are in Indian Standard Time (IST).
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

const FIELDS = [
  {
    key: "name",
    label: "Full Name",
    type: "text",
    placeholder: "Your full name",
  },
  {
    key: "phone",
    label: "Phone Number",
    type: "tel",
    placeholder: "Mobile number",
  },
  { key: "dob", label: "Date of Birth", type: "date", placeholder: "" },
  { key: "tob", label: "Time of Birth", type: "time", placeholder: "" },
  {
    key: "pob",
    label: "Place of Birth",
    type: "text",
    placeholder: "City, State, Country",
  },
  {
    key: "notes",
    label: "Your Questions / Notes (optional)",
    type: "textarea",
    placeholder: "What would you like to know?",
  },
];

function Step2({ form, setForm, errors }) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="p-5 sm:p-6 space-y-1"
    >
      <p className="text-xs font-body text-black/40">
        Please fill in your details accurately for the best consultation
        experience.
      </p>
      {FIELDS.map(({ key, label, type, placeholder }) => (
        <div key={key} className="flex flex-col gap-1 mt-1.5 first:mt-0">
          <label className="text-[11px] font-body font-semibold text-primary/70 leading-none mt-3">
            {label}
          </label>
          {type === "textarea" ? (
            <textarea
              rows={2}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-lg border border-black/12 bg-secondary/10 text-primary text-xs font-body placeholder-black/25 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            />
          ) : key === "phone" ? (
            <PhoneInput
              country="in"
              value={
                form.phone.startsWith("+") ? form.phone.slice(1) : form.phone
              }
              onChange={(value) =>
                setForm((f) => ({ ...f, phone: "+" + value }))
              }
              enableSearch
              containerStyle={{ width: "100%" }}
              inputStyle={{
                width: "100%",
                background: errors.phone ? "#fef2f2" : "rgba(255,255,255,0.08)",
                border: errors.phone
                  ? "1px solid #fca5a5"
                  : "1px solid rgba(0,0,0,0.12)",
                borderRadius: "0.5rem",
                color: "#100D42",
                fontSize: "0.75rem",
                height: "36px",
                paddingLeft: "50px",
                fontFamily: "inherit",
              }}
              buttonStyle={{
                background: errors.phone ? "#fef2f2" : "rgba(255,255,255,0.08)",
                border: "none",
                borderRight: errors.phone
                  ? "1px solid #fca5a5"
                  : "1px solid rgba(0,0,0,0.12)",
                borderRadius: "0.5rem 0 0 0.5rem",
              }}
              dropdownStyle={{
                background: "white",
                color: "#100D42",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: "0.5rem",
                zIndex: 50,
              }}
              inputProps={{ autoComplete: "tel", "aria-label": "Phone number" }}
            />
          ) : (
            <input
              type={type}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
              className={`w-full px-3 py-2.5 rounded-lg border bg-secondary/10 text-primary text-xs font-body placeholder-black/25 focus:outline-none focus:ring-1 transition-all
          ${errors[key] ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-black/12 focus:border-primary/40 focus:ring-primary/20"}`}
            />
          )}
          {errors[key] && (
            <p className="text-[10px] text-red-500 font-body leading-none">
              {errors[key]}
            </p>
          )}
        </div>
      ))}
    </motion.div>
  );
}

function Step3({ consultation, selectedDate, selectedSlot, form }) {
  const { convert, currency, rates } = useCurrency();
  const modeObj = consultation?.selectedMode;
  const priceInr = modeObj?.price?.inr ?? consultation?.price?.inr ?? 0;
  const chargeInr = modeObj?.priceWithGst || consultation?.priceWithGst || priceInr;
  const formattedPrice = chargeInr > 0 ? convert(chargeInr) : "—";
  const gstType = modeObj?.gst?.type ?? consultation?.gst?.type ?? "inclusive";
  const mode = modeObj?.mode ?? consultation?.mode;
  const modeLbl = MODE_LABELS[mode] ?? mode ?? "—";

  const rows = [
    { label: "Consultation", value: consultation?.title },
    { label: "Mode", value: modeLbl },
    mode !== "in_person" && { label: "Duration", value: `${consultation?.duration} Min` },
    {
      label: "Date",
      value: selectedDate?.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    mode === "in_person"
      ? { label: "Time", value: selectedSlot ? selectedSlot.startTime : "" }
      : {
          label: "Slot",
          value: selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : "",
        },
    { label: "Name", value: form.name },
    { label: "Phone", value: form.phone },
    { label: "DOB", value: form.dob },
    { label: "Time of Birth", value: form.tob },
    { label: "Place of Birth", value: form.pob },
  ].filter(Boolean);

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="p-5 sm:p-6 space-y-4"
    >
      <div className="bg-secondary/20 border border-primary/10 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-body font-bold text-primary/50 uppercase tracking-widest">
          Booking Summary
        </p>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <span className="text-black/40 font-body shrink-0">{label}</span>
            <span className="text-primary font-body font-semibold text-right">
              {value}
            </span>
          </div>
        ))}
        <div className="border-t border-dashed border-primary/15 pt-3 flex justify-between items-baseline">
          <span className="font-heading font-bold text-primary">Total</span>
          <span className="font-heading font-bold text-primary text-xl">
            {formattedPrice}
          </span>
        </div>
        <p className="text-[10px] font-body text-black/35 text-right -mt-2">
          {gstType === "inclusive" ? "Inclusive of GST" : "Includes GST added at checkout"}
        </p>
      </div>
      <p className="text-[11px] font-body text-black/40 text-center leading-relaxed">
        By confirming, you agree to our cancellation policy. Full refund if
        cancelled 24 hours before appointment.
      </p>
    </motion.div>
  );
}

const toBackendDate = (date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const toBackendSlot = (slot) => `${slot.startTime}-${slot.endTime}`;

export default function BookingModal({ consultation, onClose, onConfirm }) {
  const { convert, currency, rates } = useCurrency();
  const {
    getSlots,
    slots,
    slotsLoading,
    createUserBooking,
    verifyConsultationPayment,
    bookingLoading,
    paymentVerificationLoading,
  } = useConsultationStore();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const userId = user?._id;

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [localSlots, setLocalSlots] = useState([]);
  const [slotMessage, setSlotMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    dob: "",
    tob: "",
    pob: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  const getBlockedDates = () => {
    const blocked = [...(consultation?.unavailableDates || [])];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = consultation?.responseDays ?? 0;

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      blocked.push(d.toISOString().split("T")[0]);
    }

    return blocked;
  };

  const displaySlots =
    localSlots.length > 0 ? localSlots : Array.isArray(slots) ? slots : [];

  const selectedMode = consultation?.selectedMode;
  const resolvedMode = selectedMode?.mode ?? consultation?.mode;
  const resolvedPrice =
    selectedMode?.priceWithGst ||
    consultation?.priceWithGst ||
    selectedMode?.price?.inr ||
    consultation?.price?.inr ||
    0;

  const formattedResolvedPrice =
    resolvedPrice > 0 ? convert(resolvedPrice) : "—";

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlotMessage("");
    setLocalSlots([]);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const res = await getSlots({
      consultationId: consultation._id,
      date: `${year}-${month}-${day}`,
    });

    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      setLocalSlots(res.data);
    } else if (res?.message) {
      setSlotMessage(res.message);
    }
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim() || !/^\+?[1-9]\d{6,14}$/.test(form.phone.trim()))
      e.phone = "Enter a valid phone number";
    if (!form.dob) e.dob = "Date of birth required";
    if (!form.tob) e.tob = "Time of birth required";
    if (!form.pob.trim()) e.pob = "Place of birth required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && selectedDate && selectedSlot) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleConfirmAndPay = async () => {
    const bookingPayload = {
      consultationId: consultation._id,
      mode: resolvedMode,
      date: toBackendDate(selectedDate),
      slot: toBackendSlot(selectedSlot),
      currency: currency?.toUpperCase() || "INR",

      exchangeRate: rates?.[currency?.toUpperCase()] || 1,
      userId,
      name: form.name,
      phone: form.phone,
      dob: form.dob,
      tob: form.tob,
      pob: form.pob,
      notes: form.notes,
    };

    const bookingRes = await createUserBooking(bookingPayload, token);
    console.log("bookingRes", bookingRes);
    if (!bookingRes?.success) return;

    const data = bookingRes.data || {};
    const bookingId = data.booking?._id;
    const {
      key,
      orderId,
      amount,
      currency: razorpayCurrency,
    } = data.razorpayConfig || {};

    if (!key || !orderId) {
      alert("Payment config error: missing key or orderId from server.");
      return;
    }

    const razorpayLoaded = await loadRazorpay();
    if (!razorpayLoaded) {
      alert("Failed to load payment gateway. Check your internet connection.");
      return;
    }

    const options = {
      key,
      amount,
      currency: razorpayCurrency || "INR",
      name: "Consultation Booking",
      description: consultation?.title,
      order_id: orderId,
      prefill: {
        name: form.name,
        contact: form.phone,
        email: user?.email || "",
      },
      theme: { color: "#6366f1" },

      handler: async (response) => {
        const verifyRes = await verifyConsultationPayment(
          {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId,
          },
          token,
        );

        if (verifyRes?.success) {
          trackPurchase({
            orderId: bookingId,
            amount: amount / 100,
            productId: consultation?._id,
            productName: consultation?.title || "Consultation Booking",
          });
          onConfirm({
            consultation,
            date: selectedDate,
            slot: selectedSlot,
            form,
            bookingData: verifyRes.data,
          });
        }
      },

      modal: { ondismiss: () => console.warn("Razorpay closed by user.") },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (r) =>
      alert(`Payment failed: ${r.error?.description || "Please try again."}`),
    );
    rzp.open();
  };

  const isProcessing = bookingLoading || paymentVerificationLoading;

  const headerSub = [
    consultation?.title,
    MODE_LABELS[resolvedMode] ?? resolvedMode,
    formattedResolvedPrice,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/8 shrink-0">
          <div>
            <h3 className="font-heading font-bold text-primary text-base sm:text-lg">
              Book Consultation
            </h3>
            <p className="text-xs font-body text-black/40 mt-0.5">
              {headerSub}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/40 text-black/40 hover:text-primary transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <StepBar step={step} />

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1
                consultation={consultation}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                onDateSelect={handleDateSelect}
                displaySlots={displaySlots}
                loading={slotsLoading}
                slotMessage={slotMessage}
                blockedDates={getBlockedDates()}
              />
            )}
            {step === 2 && (
              <Step2 form={form} setForm={setForm} errors={errors} />
            )}
            {step === 3 && (
              <Step3
                consultation={consultation}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                form={form}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 px-5 sm:px-6 py-4 border-t border-black/8 shrink-0 bg-white">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/12 text-black/50 text-sm font-body font-medium hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 1 && (!selectedDate || !selectedSlot)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-body font-bold text-sm hover:bg-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-700 shadow-md shadow-primary/20"
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <motion.button
              type="button"
              onClick={handleConfirmAndPay}
              disabled={isProcessing}
              whileTap={!isProcessing ? { scale: 0.97 } : {}}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-body font-bold text-sm hover:bg-gold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-700 shadow-md shadow-primary/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />{" "}
                  {bookingLoading ? "Creating booking…" : "Verifying payment…"}
                </>
              ) : (
                <>
                  <Shield size={14} />
                  Confirm & Pay {formattedResolvedPrice}
                </>
              )}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
