/* eslint-disable no-unused-vars */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Loader2, Home, Briefcase, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import PhoneInput from "../../lib/phoneInput";
const overlayVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};
const slideUp = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: 30, transition: { duration: 0.25 } },
};
export function AddAddressModal({ isOpen, onClose, onAdd,  }) {
 const { addAddress, loading } = useAuthStore();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    type: "Home",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^\+?[1-9]\d{6,14}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.addressLine1.trim()) e.addressLine1 = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state.trim()) e.state = "State is required";
    if (!/^\d{6}$/.test(form.pincode))
      e.pincode = "Enter valid 6-digit pincode";
    return e;
  };
const handleSubmit = async () => {
  const e = validate();

  if (Object.keys(e).length) {
    setErrors(e);
    return;
  }

  const payload = {
    fullName: form.name,
    phone: form.phone,

    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,

    city: form.city,
    state: form.state,
    pincode: form.pincode,

    type: form.type.toLowerCase(),

    isDefault: false,
  };

  const res = await addAddress(payload);

  if (res?.success) {
    onClose();

    setForm({
      name: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      type: "Home",
    });
  }
};
  const field = (key, label, placeholder, type = "text", half = false) => (
    <div className={half ? "col-span-1" : "col-span-2"}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => {
          setForm((f) => ({ ...f, [key]: e.target.value }));
          setErrors((er) => ({ ...er, [key]: "" }));
        }}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${
          errors[key]
            ? "border-red-400 bg-red-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      />
      {errors[key] && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariant}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            variants={slideUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Add New Address
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fill in your delivery details
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Address Type
                </label>
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                        form.type === t
                          ? "bg-primary text-white border-teal-700 shadow-md shadow-teal-200"
                          : "border-gray-200 text-gray-600 hover:border-teal-300"
                      }`}
                    >
                      {t === "Home" ? (
                        <Home className="w-3 h-3" />
                      ) : t === "Work" ? (
                        <Briefcase className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {field("name", "Full Name", "Your full name")}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <PhoneInput
                    country="in"
                    value={form.phone.startsWith("+") ? form.phone.slice(1) : form.phone}
                    onChange={(value) => {
                      setForm((f) => ({ ...f, phone: "+" + value }));
                      setErrors((er) => ({ ...er, phone: "" }));
                    }}
                    enableSearch
                    containerStyle={{ width: "100%" }}
                    inputStyle={{
                      width: "100%",
                      background: errors.phone ? "#fef2f2" : "#f9fafb",
                      border: errors.phone ? "1px solid #f87171" : "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      color: "#1f2937",
                      fontSize: "0.875rem",
                      height: "42px",
                      paddingLeft: "50px",
                      fontFamily: "inherit",
                    }}
                    buttonStyle={{
                      background: errors.phone ? "#fef2f2" : "#f9fafb",
                      border: "none",
                      borderRight: errors.phone ? "1px solid #f87171" : "1px solid #e5e7eb",
                      borderRadius: "0.75rem 0 0 0.75rem",
                    }}
                    dropdownStyle={{
                      background: "white",
                      color: "#1f2937",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      zIndex: 50,
                    }}
                    inputProps={{ autoComplete: "tel", "aria-label": "Phone number" }}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.phone}
                    </p>
                  )}
                </div>
                {field(
                  "addressLine1",
                  "Address Line 1",
                  "House / Flat / Block No.",
                )}
                {field(
                  "addressLine2",
                  "Address Line 2 (Optional)",
                  "Street / Colony / Area",
                )}
                {field("city", "City", "City", "text", true)}
                {field("state", "State", "State", "text", true)}
                {field("pincode", "Pincode", "6-digit pincode", "text", true)}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-teal-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-teal-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Address"
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
