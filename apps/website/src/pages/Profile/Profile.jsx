/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */

import toast from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ShoppingBag,
  FileText,
  Heart,
  CalendarCheck,
  Download,
  LogOut,
  Camera,
  MapPin,
  Clock,
  Calendar,
  ChevronDown,
  Save,
  Menu,
  X,
} from "lucide-react";
import PhoneInput from "../../lib/phoneInput";

function FloatInput({
  label,
  id,
  type = "text",
  value,
  onChange,
  icon: Icon,
  readOnly,
}) {
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="absolute -top-2.5 left-3 px-1 text-[11px] font-body bg-secondary text-black/45 tracking-wider z-1"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full px-4 py-3.5 rounded-xl border border-black/15 text-sm font-body text-black outline-none transition-all duration-200
    focus:border-primary/60 focus:ring-2 focus:ring-primary/15
    ${readOnly ? "opacity-60 cursor-default" : ""}
    ${Icon ? "pr-10" : ""}
    ${
      type === "date" || type === "time"
        ? "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        : ""
    }`}
      />
      {Icon && (
        <Icon
          size={16}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none"
        />
      )}
    </div>
  );
}

function FloatSelect({ label, id, value, onChange, options }) {
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="absolute -top-2.5 left-3 px-1 text-[11px] bg-secondary font-body text-black/45 tracking-wider z-10"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3.5 rounded-xl border border-black/15 bg-secondary text-sm font-body text-black outline-none appearance-none transition-all duration-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none"
      />
    </div>
  );
}

export default function MyProfile() {
  const { user, updateProfile, updateProfilePhoto, loading, getProfile } =
    useAuthStore();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    birthPlace: "",
    birthTime: "",
    gender: "male",
    dob: "",
  });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      birthPlace: user.birthPlace || "",
      birthTime: user.birthTime || "",
      gender: user.gender || "male",
      dob: user.dob || "",
    });
    setPreview(user.profilePhoto || null);
  }, [user]);

  useEffect(() => {
    if (!user) getProfile();
  }, []);

  const setField = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const res = await updateProfilePhoto(file);
    if (res?.success) await getProfile();
    else {
      toast.error(res?.error || "Upload failed");
      setPreview(user?.profilePhoto || null); // revert
    }
  };

  const handleSubmit = async () => {
    const res = await updateProfile({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      birthPlace: form.birthPlace,
      birthTime: form.birthTime,
      gender: form.gender,
      dob: form.dob,
    });
    if (res?.success) toast.success("Profile updated!");
    else toast.error(res?.error || "Failed to update");
  };

  if (!user && loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex items-center gap-5">
          <div className="w-28 h-28 rounded-2xl bg-black/8" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-black/8 rounded-full" />
            <div className="h-3 w-44 bg-black/8 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-black/8" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <div className="relative shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed border-primary/30 overflow-hidden bg-secondary/20">
            {preview ? (
              <img
                src={preview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={40} className="text-primary/25" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change photo"
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-gold transition-colors duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>

        <div className="text-center sm:text-left">
          <p className="font-heading text-black text-xl">
            {form.firstName || form.lastName
              ? `${form.firstName} ${form.lastName}`.trim()
              : "—"}
          </p>
          <p className="text-black/45 text-sm font-body mt-0.5">
            {form.email || "—"}
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 px-5 py-2 cursor-pointer rounded-xl bg-primary hover:bg-gold text-white font-body text-xs font-medium hover:text-white transition-all duration-700 focus-visible:outline-none"
          >
            Update Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-7">
        <FloatInput
          label="First Name"
          id="firstName"
          value={form.firstName}
          onChange={setField("firstName")}
        />
        <FloatInput
          label="Last Name"
          id="lastName"
          value={form.lastName}
          onChange={setField("lastName")}
        />
        <FloatInput
          label="Email"
          id="email"
          type="email"
          value={form.email}
          onChange={setField("email")}
          // readOnly
        />
        <div className="relative">
          <label
            htmlFor="phoneNumber"
            className="absolute -top-2.5 left-3 px-1 text-[11px] font-body bg-secondary text-black/45 tracking-wider z-10"
          >
            Phone
          </label>
          <PhoneInput
            country="in"
            value={
              form.phoneNumber.startsWith("+")
                ? form.phoneNumber.slice(1)
                : form.phoneNumber
            }
            onChange={(value) =>
              setForm((p) => ({ ...p, phoneNumber: "+" + value }))
            }
            enableSearch
            containerStyle={{ width: "100%" }}
            inputStyle={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "0.75rem",
              color: "black",
              fontSize: "0.875rem",
              height: "52px",
              paddingLeft: "50px",
              fontFamily: "inherit",
            }}
            buttonStyle={{
              background: "transparent",
              border: "none",
              borderRight: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "0.75rem 0 0 0.75rem",
            }}
            dropdownStyle={{
              background: "white",
              color: "black",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "0.5rem",
              zIndex: 50,
            }}
            inputProps={{
              id: "phoneNumber",
              autoComplete: "tel",
              "aria-label": "Phone number",
            }}
          />
        </div>
        <FloatInput
          label="Birth Place"
          id="birthPlace"
          value={form.birthPlace}
          onChange={setField("birthPlace")}
          icon={MapPin}
        />
        <FloatInput
          label="Birth Time"
          id="birthTime"
          type="time"
          value={form.birthTime}
          onChange={setField("birthTime")}
          icon={Clock}
        />

        <FloatSelect
          label="Gender"
          id="gender"
          value={form.gender}
          onChange={setField("gender")}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
        />
        <FloatInput
          label="Date of Birth"
          id="dob"
          type="date"
          value={form.dob}
          onChange={setField("dob")}
          icon={Calendar}
        />
      </div>

      <div className="flex justify-end pt-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-heading text-sm tracking-widest uppercase shadow-lg shadow-primary/25 hover:bg-gold disabled:opacity-60 transition-all duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {loading ? "Saving…" : "Update"}
        </motion.button>
      </div>
    </motion.div>
  );
}
