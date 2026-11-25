/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Video,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  Loader2,
  CalendarDays,
  ChevronDown,
  User,
  Star,
} from "lucide-react";
import PageHero from "../../components/HeroPage";
import { useConsultationStore } from "../../store/useConsultationStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import { MODE_LABELS, fmt } from "./Consultationconstants";
import toast from "react-hot-toast";
import Seo from "../../components/Seo";
import { trackPurchase } from "../../utils/analytics";
import PhoneInput from "../../lib/phoneInput";

const MODE_ICONS = {
  audio: <Phone size={13} />,
  video: <Video size={13} />,
  in_person: <MapPin size={13} />,
};

const STEPS = ["Choose Service", "Pick Date & Slot", "Your Details", "Confirm"];

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
    label: "Questions / Notes (optional)",
    type: "textarea",
    placeholder: "What would you like to know?",
  },
];

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


const toBackendDate = (date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};
const toBackendSlot = (slot) => `${slot.startTime}-${slot.endTime}`;

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const current = step === num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: current ? 1.15 : 1,
                  backgroundColor: done
                    ? "#100D42"
                    : current
                      ? "var(--color-primary, #100D42)"
                      : "#e5e7eb",
                }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                style={{ color: done || current ? "#fff" : "#9ca3af" }}
              >
                {done ? <Check size={13} /> : num}
              </motion.div>
              <span
                className={`text-[10px] font-semibold hidden sm:block whitespace-nowrap transition-colors ${current ? "text-primary" : done ? "text-primary" : "text-black/30"}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-1 -mt-3.5 transition-colors duration-500 ${done ? "bg-primary" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomDropdown({
  label,
  icon,
  value,
  placeholder,
  options,
  onChange,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <p className="text-xs font-semibold text-primary/60 mb-1.5 uppercase tracking-widest">
        {label}
      </p>
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
          ${disabled ? "bg-gray-50 border-gray-100 text-black/30 cursor-not-allowed" : "bg-white border-black/10 hover:border-primary/40 text-primary cursor-pointer shadow-sm hover:shadow-md"}
          ${open ? "border-primary/50 ring-2 ring-primary/10" : ""}`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className={`shrink-0 ${selected ? "text-primary" : "text-black/25"}`}
          >
            {icon}
          </span>
          <span
            className={`truncate ${selected ? "text-primary font-semibold" : "text-black/35"}`}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-black/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 w-full bg-white border border-black/8 rounded-xl shadow-xl overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-primary/5 transition-colors
                  ${opt.value === value ? "bg-primary/8 text-primary font-semibold" : "text-black/70"}`}
              >
                {opt.value === value && (
                  <Check size={13} className="text-primary shrink-0" />
                )}
                <span className={opt.value === value ? "" : "pl-5.25"}>
                  {opt.label}
                </span>
                {opt.subtitle && (
                  <span className="ml-auto text-xs text-black/30">
                    {opt.subtitle}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModePill({ modeObj, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer
        ${
          selected
            ? "bg-primary text-white border-primary shadow-sm shadow-primary/25"
            : "bg-white text-primary border-primary/25 hover:bg-primary/8 hover:border-primary/40"
        }`}
    >
      {MODE_ICONS[modeObj.mode]}
      {MODE_LABELS[modeObj.mode] || modeObj.mode}
      {selected && (
        <span className="ml-1 font-bold">
          · ₹{modeObj.price?.inr?.toLocaleString("en-IN")}
        </span>
      )}
    </button>
  );
}

function Step1({
  consultations,
  selectedCategory,
  setSelectedCategory,
  selectedPlanId,
  setSelectedPlanId,
  selectedModeIdx,
  setSelectedModeIdx,
}) {
  // Derive unique categories (use "type" as category: normal / special)
  const categories = [
    { value: "normal", label: "Normal Consultation" },
    { value: "special", label: "Special Consultation" },
  ];

  const filteredPlans = consultations.filter(
    (c) => c.type === selectedCategory && c.isActive,
  );

  const planOptions = filteredPlans.map((p) => ({
    value: p._id,
    label: p.title,
    subtitle: `${p.duration} min`,
  }));

  const selectedPlan = filteredPlans.find((p) => p._id === selectedPlanId);
  const modes = selectedPlan?.modes || [];

  // Reset plan when category changes
  useEffect(() => {
    setSelectedPlanId("");
    setSelectedModeIdx(0);
  }, [selectedCategory]);

  // Reset mode when plan changes
  useEffect(() => {
    setSelectedModeIdx(0);
  }, [selectedPlanId]);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <CustomDropdown
        label="Category"
        icon={<Star size={15} />}
        value={selectedCategory}
        placeholder="Select category"
        options={categories}
        onChange={setSelectedCategory}
      />

      <CustomDropdown
        label="Service"
        icon={<Sparkles size={15} />}
        value={selectedPlanId}
        placeholder="Select service"
        options={planOptions}
        onChange={setSelectedPlanId}
        disabled={!selectedCategory}
      />

      {/* Plan detail card */}
      <AnimatePresence mode="wait">
        {selectedPlan && (
          <motion.div
            key={selectedPlan._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="bg-[#F9F7FF] border border-primary/10 rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-primary/8">
              <h3 className="font-bold text-primary text-base">
                {selectedPlan.title}
              </h3>
              {selectedPlan.responseDays > 0 && (
                <p className="text-xs text-black/40 mt-0.5 flex items-center gap-1">
                  <Clock size={11} /> Appointment within{" "}
                  {selectedPlan.responseDays} days
                </p>
              )}
              {selectedPlan.description && (
                <p className="text-xs text-black/50 mt-2 leading-relaxed">
                  {selectedPlan.description}
                </p>
              )}
            </div>

            {/* Includes */}
            {selectedPlan.includes?.length > 0 && (
              <div className="px-5 py-4 border-b border-primary/8">
                <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-3">
                  Includes
                </p>
                <div className="space-y-2">
                  {selectedPlan.includes.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Sparkles
                        size={12}
                        className="shrink-0 text-primary mt-0.5"
                      />
                      <p className="text-xs text-black/60 leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode selection */}
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-3">
                Select Mode
              </p>
              <div className="flex flex-wrap gap-2">
                {modes.map((m, i) => (
                  <ModePill
                    key={m._id}
                    modeObj={m}
                    selected={selectedModeIdx === i}
                    onClick={() => setSelectedModeIdx(i)}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-black/40">
                  <Clock size={11} /> {selectedPlan.duration} min session
                </span>
                <span className="font-bold text-primary text-xl">
                  ₹
                  {modes[selectedModeIdx]?.price?.inr?.toLocaleString(
                    "en-IN",
                  ) ?? "—"}
                </span>
              </div>
            </div>

            {selectedPlan.note && (
              <div className="px-5 pb-4">
                <p className="text-[11px] text-black/40 leading-relaxed">
                  <span className="font-semibold text-black/55">Note: </span>
                  {selectedPlan.note}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Step2({
  consultation,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setSelectedSlot,
  displaySlots,
  slotsLoading,
  slotMessage,
  onDateSelect,
}) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <div>
        <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest mb-3">
          Select Date
        </p>
        <MiniCalendar
          selected={selectedDate}
          onSelect={onDateSelect}
          blockedDates={consultation?.unavailableDates || []}
        />
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest mb-3">
              Available Slots —{" "}
              {selectedDate.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </p>

            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary/40" />
              </div>
            ) : slotMessage && displaySlots.length === 0 ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Clock size={14} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">{slotMessage}</p>
              </div>
            ) : displaySlots.length === 0 ? (
              <p className="text-sm text-black/40 text-center py-6">
                No slots available for this date.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {displaySlots.map((slot, i) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2.5 px-1 rounded-xl text-xs font-semibold border transition-all duration-150 text-center cursor-pointer
                        ${
                          isSelected
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                            : "border-black/10 text-black/60 bg-white hover:border-primary/40 hover:text-primary"
                        }`}
                    >
                      {slot.startTime}
                      <span className="block text-[10px] opacity-70">
                        {slot.endTime}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Step3({ form, setForm, errors }) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <p className="text-xs text-black/40 leading-relaxed">
        Please fill in your details accurately for the best consultation
        experience.
      </p>
      {FIELDS.map(({ key, label, type, placeholder }) => (
        <div key={key}>
          <label className="block text-xs font-semibold text-primary/70 mb-1">
            {label}
          </label>
          {type === "textarea" ? (
            <textarea
              rows={3}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 bg-white text-primary text-sm placeholder-black/25 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            />
          ) : key === "phone" ? (
            <PhoneInput
              country="in"
              value={form.phone.startsWith("+") ? form.phone.slice(1) : form.phone}
              onChange={(value) => setForm((f) => ({ ...f, phone: "+" + value }))}
              enableSearch
              containerStyle={{ width: "100%" }}
              inputStyle={{
                width: "100%",
                background: "white",
                border: errors.phone ? "1px solid #fca5a5" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: "0.75rem",
                color: "#100D42",
                fontSize: "0.875rem",
                height: "42px",
                paddingLeft: "50px",
                fontFamily: "inherit",
              }}
              buttonStyle={{
                background: "white",
                border: "none",
                borderRight: errors.phone ? "1px solid #fca5a5" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: "0.75rem 0 0 0.75rem",
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
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-primary text-sm placeholder-black/25 focus:outline-none focus:ring-1 transition-all
                ${errors[key] ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-black/12 focus:border-primary/40 focus:ring-primary/20"}`}
            />
          )}
          {errors[key] && (
            <p className="text-[11px] text-red-500 mt-0.5">{errors[key]}</p>
          )}
        </div>
      ))}
    </motion.div>
  );
}

function Step4({ plan, activeMode, selectedDate, selectedSlot, form }) {
  const price = activeMode?.priceWithGst || activeMode?.price?.inr;
  const gstType = activeMode?.gst?.type ?? "inclusive";
  const rows = [
    { label: "Service", value: plan?.title },
    { label: "Mode", value: MODE_LABELS[activeMode?.mode] ?? activeMode?.mode },
    activeMode?.mode !== "in_person" && { label: "Duration", value: `${plan?.duration} Min` },
    {
      label: "Date",
      value: selectedDate?.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    activeMode?.mode === "in_person"
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
    form.notes && { label: "Notes", value: form.notes },
  ].filter(Boolean);

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <div className="bg-[#F9F7FF] border border-primary/10 rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-bold text-primary/50 uppercase tracking-widest">
          Booking Summary
        </p>
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <span className="text-black/40 shrink-0">{label}</span>
            <span className="text-primary font-semibold text-right">
              {value}
            </span>
          </div>
        ))}
        <div className="border-t border-dashed border-primary/15 pt-3 flex justify-between items-baseline">
          <span className="font-bold text-primary">Total</span>
          <span className="font-bold text-primary text-2xl">{fmt(price)}</span>
        </div>
        <p className="text-[10px] text-black/35 text-right -mt-2">
          {gstType === "inclusive" ? "Inclusive of GST" : "Includes GST added at checkout"}
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
        <Shield size={14} className="text-primary shrink-0 mt-0.5" />
        
      </div>
    </motion.div>
  );
}

export default function Bookappointment() {
  const [step, setStep] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState("normal");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedModeIdx, setSelectedModeIdx] = useState(0);

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

  const {
    consultations,
    consultationsLoading,
    getConsultations,
    getSlots,
    slots,
    slotsLoading,
    createUserBooking,
    verifyConsultationPayment,
    bookingLoading,
    paymentVerificationLoading,
  } = useConsultationStore();
  const { token } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    getConsultations();
  }, []);

  const activePlans = consultations.filter(
    (c) => c.type === selectedCategory && c.isActive,
  );
  const selectedPlan = activePlans.find((p) => p._id === selectedPlanId);
  const activeMode = selectedPlan?.modes?.[selectedModeIdx];
  const resolvedPrice = activeMode?.priceWithGst || activeMode?.price?.inr;

  const displaySlots =
    localSlots.length > 0 ? localSlots : Array.isArray(slots) ? slots : [];

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlotMessage("");
    setLocalSlots([]);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const res = await getSlots({
      consultationId: selectedPlan._id,
      date: `${year}-${month}-${day}`,
    });
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      setLocalSlots(res.data);
    } else if (res?.message) {
      setSlotMessage(res.message);
    }
  };

  const validateStep3 = () => {
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
    if (step === 1 && selectedPlan && activeMode) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (step === 2 && selectedDate && selectedSlot) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (step === 3 && validateStep3()) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmAndPay = async () => {
    if (!token) {
      toast.error("Please login to book a consultation");
      navigate("/login");
      return;
    }

    const bookingPayload = {
      consultationId: selectedPlan._id,
      mode: activeMode.mode,
      date: toBackendDate(selectedDate),
      slot: toBackendSlot(selectedSlot),
      userId: user?._id,
      name: form.name,
      phone: form.phone,
      dob: form.dob,
      tob: form.tob,
      pob: form.pob,
      notes: form.notes,
    };

    const bookingRes = await createUserBooking(bookingPayload, token);
    if (!bookingRes?.success) return;

    const data = bookingRes.data || {};
    const bookingId = data.booking?._id;
    const { key, orderId, amount, currency } = data.razorpayConfig || {};

    if (!key || !orderId) {
      alert("Payment config error: missing key or orderId from server.");
      return;
    }

    const razorpayLoaded = await loadRazorpay();
    if (!razorpayLoaded) {
      alert("Failed to load payment gateway.");
      return;
    }

    const options = {
      key,
      amount,
      currency: currency || "INR",
      name: "Consultation Booking",
      description: selectedPlan?.title,
      order_id: orderId,
      prefill: {
        name: form.name,
        contact: form.phone,
        email: user?.email || "",
      },
      theme: { color: "#100D42" },
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
            productName: selectedPlan?.title || "Consultation Booking",
          });
          toast.success("Booking confirmed! 🎉");
          navigate("/dashboard");
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

  const canNext =
    (step === 1 && selectedPlan && activeMode) ||
    (step === 2 && selectedDate && selectedSlot) ||
    step === 3;

  return (
    <>
      <Seo page="book appointments" />
      <PageHero
        title="Book Your Appointment"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Consultation", href: "/online-consultations/" },
        ]}
      />

      <section className="w-full bg-[#f5f7f6] py-12 sm:py-16 lg:py-20 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Step indicator */}
          <StepIndicator step={step} />

          {/* Card */}
          <div className="bg-white rounded-3xl border border-black/6 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 sm:px-8 py-5 border-b border-black/5 bg-linear-to-r from-primary/3 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarDays size={17} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-primary text-base">
                    {STEPS[step - 1]}
                  </h2>
                  <p className="text-xs text-black/35">
                    Step {step} of {STEPS.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 sm:px-8 py-6">
              {consultationsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-primary/40" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <Step1
                      key="s1"
                      consultations={consultations}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      selectedPlanId={selectedPlanId}
                      setSelectedPlanId={setSelectedPlanId}
                      selectedModeIdx={selectedModeIdx}
                      setSelectedModeIdx={setSelectedModeIdx}
                    />
                  )}
                  {step === 2 && (
                    <Step2
                      key="s2"
                      consultation={selectedPlan}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      selectedSlot={selectedSlot}
                      setSelectedSlot={setSelectedSlot}
                      displaySlots={displaySlots}
                      slotsLoading={slotsLoading}
                      slotMessage={slotMessage}
                      onDateSelect={handleDateSelect}
                    />
                  )}
                  {step === 3 && (
                    <Step3
                      key="s3"
                      form={form}
                      setForm={setForm}
                      errors={errors}
                    />
                  )}
                  {step === 4 && (
                    <Step4
                      key="s4"
                      plan={selectedPlan}
                      activeMode={activeMode}
                      selectedDate={selectedDate}
                      selectedSlot={selectedSlot}
                      form={form}
                    />
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Card footer – navigation */}
            <div className="px-6 sm:px-8 py-5 border-t border-black/5 bg-gray-50/50 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-black/12 text-black/50 text-sm font-semibold hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} /> Back
                </button>
              )}

              {step < 4 ? (
                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={!canNext}
                  whileHover={canNext ? { scale: 1.02 } : {}}
                  whileTap={canNext ? { scale: 0.97 } : {}}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/85 disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
                >
                  Continue <ChevronRight size={15} />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={handleConfirmAndPay}
                  disabled={isProcessing}
                  whileHover={!isProcessing ? { scale: 1.02 } : {}}
                  whileTap={!isProcessing ? { scale: 0.97 } : {}}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/85 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{" "}
                      {bookingLoading
                        ? "Creating booking…"
                        : "Verifying payment…"}
                    </>
                  ) : (
                    <>
                      <Shield size={14} /> Confirm & Pay {fmt(resolvedPrice)}
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
