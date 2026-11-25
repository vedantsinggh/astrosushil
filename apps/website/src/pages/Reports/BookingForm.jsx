/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useReportStore from "@/store/useReportStore";
import { useCurrency } from "../../hooks/useCurrency";
import { Check, Loader2, MapPin } from "lucide-react";
import { useAstrologyStore } from "../../store/useAstrologyStore";
import { trackPurchase } from "../../utils/analytics";
import PhoneInput from "@/lib/phoneInput";

const getPhoneInputStyle = (hasError) => ({
  width: "100%",
  background: "#faf8f4",
  border: `1px solid ${hasError ? "#f87171" : "#F4EEFF"}`,
  borderRadius: "0.75rem",
  color: "#222",
  fontSize: "0.875rem",
  height: "42px",
  paddingLeft: "50px",
  fontFamily: "inherit",
});

const getPhoneButtonStyle = (hasError) => ({
  background: "transparent",
  border: "none",
  borderRight: `1px solid ${hasError ? "#f87171" : "#F4EEFF"}`,
  borderRadius: "0.75rem 0 0 0.75rem",
});

const DIAMOND = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    className="inline-block mr-2 shrink-0 mt-0.5"
  >
    <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="#d4af37" />
  </svg>
);

export default function BookingForm() {
  const { slug } = useParams();
  const { report, loading, getReportBySlug, buyReport, verifyReportPayment } =
    useReportStore();
  const { getGeoDetails } = useAstrologyStore();
  const { currency, rates, convert } = useCurrency();

  const currencyRate = rates?.[currency] || 1;
  const processingRef = useRef(false); // razorpay open hone ke baad block karo

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    whatsapp: "",
    dob: "",
    timeOfBirth: "",
    birthPlace: "",
    gender: "",
    pinCode: "",
    reportLanguage: "",
    addConsultation: false,
    agreed: false,
    latitude: "",
    longitude: "",
    brideFullName: "",
    brideEmail: "",
    brideWhatsapp: "",
    brideDob: "",
    brideTimeOfBirth: "",
    brideBirthPlace: "",
    brideGender: "female",
    bridePinCode: "",
    brideLatitude: "",
    brideLongitude: "",
    groomFullName: "",
    groomEmail: "",
    groomWhatsapp: "",
    groomDob: "",
    groomTimeOfBirth: "",
    groomBirthPlace: "",
    groomGender: "male",
    groomPinCode: "",
    groomLatitude: "",
    groomLongitude: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [btnState, setBtnState] = useState("idle"); // "idle" | "buying" | "verifying"

  const [suggestions, setSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activePlaceField, setActivePlaceField] = useState("birthPlace");
  const debounceRef = useRef(null);

  const navigate = useNavigate();

  const isMatchMaking = report?.reportType === "match_making_pdf";

  useEffect(() => {
    if (slug) getReportBySlug(slug);
  }, [slug]);

  const locationFields = {
    birthPlace: ["latitude", "longitude"],
    brideBirthPlace: ["brideLatitude", "brideLongitude"],
    groomBirthPlace: ["groomLatitude", "groomLongitude"],
  };

  const handlePlaceChange = (e) => {
    const name = e.target.name;
    const val = e.target.value;
    const [latField, longField] = locationFields[name] || [
      "latitude",
      "longitude",
    ];

    setActivePlaceField(name);
    setForm((prev) => ({
      ...prev,
      [name]: val,
      [latField]: "",
      [longField]: "",
    }));
    setSuggestions([]);
    setShowDropdown(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true);
      const res = await getGeoDetails({ place: val.trim() });
      setGeoLoading(false);
      if (res.success && res.data?.length) {
        setSuggestions(res.data);
        setShowDropdown(true);
      }
    }, 400);
  };

  const handleSelect = (item) => {
    const [latField, longField] = locationFields[activePlaceField] || [
      "latitude",
      "longitude",
    ];

    setForm((prev) => ({
      ...prev,
      [activePlaceField]: item.formattedAddress,
      [latField]: String(item.location.latitude),
      [longField]: String(item.location.longitude),
    }));
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePhoneChange = (name) => (value) => {
    setForm((prev) => ({ ...prev, [name]: value ? "+" + value : "" }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};

    if (isMatchMaking) {
      if (!form.brideFullName.trim()) errs.brideFullName = "Required";
      if (!form.brideEmail.trim()) errs.brideEmail = "Required";
      if (!form.brideWhatsapp.trim()) errs.brideWhatsapp = "Required";
      if (!form.brideDob) errs.brideDob = "Required";
      if (!form.brideTimeOfBirth) errs.brideTimeOfBirth = "Required";
      if (!form.brideBirthPlace.trim()) {
        errs.brideBirthPlace = "Required";
      } else if (!form.brideLatitude || !form.brideLongitude) {
        errs.brideBirthPlace = "Please select a valid location.";
      }

      if (!form.brideGender) errs.brideGender = "Required";
      if (!form.bridePinCode.trim()) errs.bridePinCode = "Required";
      if (!form.groomFullName.trim()) errs.groomFullName = "Required";
      if (!form.groomEmail.trim()) errs.groomEmail = "Required";
      if (!form.groomWhatsapp.trim()) errs.groomWhatsapp = "Required";
      if (!form.groomDob) errs.groomDob = "Required";
      if (!form.groomTimeOfBirth) errs.groomTimeOfBirth = "Required";
      if (!form.groomBirthPlace.trim()) {
        errs.groomBirthPlace = "Required";
      } else if (!form.groomLatitude || !form.groomLongitude) {
        errs.groomBirthPlace = "Please select a valid location.";
      }

      if (!form.groomGender) errs.groomGender = "Required";
      if (!form.groomPinCode.trim()) errs.groomPinCode = "Required";
    } else {
      if (!form.fullName.trim()) errs.fullName = "Required";
      if (!form.email.trim()) errs.email = "Required";
      if (!form.whatsapp.trim()) errs.whatsapp = "Required";
      if (!form.dob) errs.dob = "Required";
      if (!form.timeOfBirth) errs.timeOfBirth = "Required";
      if (!form.birthPlace.trim()) {
        errs.birthPlace = "Required";
      } else if (!form.latitude || !form.longitude) {
        errs.birthPlace = "Please select a valid place.";
      }
      if (!form.gender) errs.gender = "Required";
      if (!form.pinCode.trim()) errs.pinCode = "Required";
    }

    if (!form.reportLanguage) errs.reportLanguage = "Required";
    if (!form.agreed) errs.agreed = "You must agree to the Terms & Conditions";
    return errs;
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleSubmit = async () => {
    // Double click guard
    if (processingRef.current) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    processingRef.current = true;
    setBtnState("buying");

    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        alert("Razorpay SDK load failed. Check your connection.");
        processingRef.current = false;
        setBtnState("idle");
        return;
      }

      const isMatchMaking = report.reportType === "match_making_pdf";

      const buyPayload = {
        reportId: report._id,
        reportType: report.reportType,
        currency,
        currencyRate,
      };

      if (isMatchMaking) {
        buyPayload.matchMakingDetails = {
          reportLanguage: form.reportLanguage,
          bride: {
            fullName: form.brideFullName,
            email: form.brideEmail,
            whatsappNumber: form.brideWhatsapp,
            dateOfBirth: form.brideDob,
            timeOfBirth: form.brideTimeOfBirth,
            birthPlace: form.brideBirthPlace,
            gender: form.brideGender,
            pinCode: form.bridePinCode,
            latitude: form.brideLatitude,
            longitude: form.brideLongitude,
          },
          groom: {
            fullName: form.groomFullName,
            email: form.groomEmail,
            whatsappNumber: form.groomWhatsapp,
            dateOfBirth: form.groomDob,
            timeOfBirth: form.groomTimeOfBirth,
            birthPlace: form.groomBirthPlace,
            gender: form.groomGender,
            pinCode: form.groomPinCode,
            latitude: form.groomLatitude,
            longitude: form.groomLongitude,
          },
        };
      } else {
        buyPayload.customerDetails = {
          fullName: form.fullName,
          email: form.email,
          whatsappNumber: form.whatsapp,
          dateOfBirth: form.dob,
          timeOfBirth: form.timeOfBirth,
          birthPlace: form.birthPlace,
          gender: form.gender,
          pinCode: form.pinCode,
          reportLanguage: form.reportLanguage,
          latitude: form.latitude,
          longitude: form.longitude,
        };
      }

      // 1. Create order
      const buyResult = await buyReport(buyPayload);

      if (!buyResult.success) {
        processingRef.current = false;
        setBtnState("idle");
        return;
      }

      // 2. Open Razorpay — button idle rakhte hain (modal open hai)
      setBtnState("idle");

      const orderData = buyResult.data;
      const options = {
        key: orderData.razorpayConfig.key,

        amount: orderData.razorpayConfig.amount,

        currency: orderData.razorpayConfig.currency || "INR",

        order_id: orderData.razorpayConfig.orderId,
        name: "Astro Sushil",
        description: report.name,

        prefill: {
          name: isMatchMaking ? form.brideFullName : form.fullName,
          email: isMatchMaking ? form.brideEmail : form.email,
          contact: isMatchMaking ? form.brideWhatsapp : form.whatsapp,
        },
        theme: { color: "#424874" },
        handler: async (response) => {
          setBtnState("verifying");

          const verifyResult = await verifyReportPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            reportId: report._id,
            formData: form,
          });

          processingRef.current = false;
          setBtnState("idle");

          if (verifyResult.success) {
            trackPurchase({
              orderId: orderData.razorpayConfig.orderId,
              amount: orderData.razorpayConfig.amount / 100,
              productId: report._id,
              productName: report.name || "Astrology Report",
            });
            setSubmitted(true);
            navigate("/report/generated-successfully");
          }
        },
        modal: {
          ondismiss: () => {
            // User ne modal band kiya — reset karo
            processingRef.current = false;
            setBtnState("idle");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong.");
      processingRef.current = false;
      setBtnState("idle");
    }
  };

  // ── Loading ──
  if (loading)
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );

  // ── Success ──
  // if (submitted)
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] px-4">
  //       <div className="text-center max-w-md">
  //         <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
  //           <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
  //             <path
  //               d="M8 18L15 25L28 11"
  //               stroke="#d4af37"
  //               strokeWidth="3"
  //               strokeLinecap="round"
  //               strokeLinejoin="round"
  //             />
  //           </svg>
  //         </div>
  //         <h2 className="font-heading text-3xl text-primary mb-3">
  //           Order Placed!
  //         </h2>
  //         <p className="font-body text-[#555] text-base mb-2">
  //           Your <strong>{report?.name}</strong> will be delivered to{" "}
  //           <strong>{form.email}</strong>.
  //         </p>
  //         <p className="font-body text-[#555] text-base">
  //           Expected delivery: <strong>2–3 working days</strong> on your email &
  //           WhatsApp.
  //         </p>
  //       </div>
  //     </div>
  //   );

  if (!report) return null;

  const isDisabled = btnState !== "idle";

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-body py-10 px-4">
      <div className="text-center mb-10">
        <p className="text-gold font-body text-sm tracking-widest uppercase mb-1">
          Jyotish Vedic Astrology
        </p>
        <h1 className="font-heading text-4xl md:text-5xl text-primary">
          Order Your {report.name}
        </h1>
        <div className="mx-auto mt-3 w-24 h-px bg-gold opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-[340px_1fr] gap-8 items-start">
        {/* LEFT */}
        <div className="bg-white rounded-2xl border border-secondary p-6 shadow-sm  top-6">
          <div className="flex justify-center mb-5">
            <img
              src={report.coverImage}
              alt={report.name}
              className="w-28 h-36 object-contain rounded-xl"
            />
          </div>
          <h2 className="font-heading text-2xl text-primary mb-1">
            {report.name}
          </h2>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-gold font-heading text-2xl font-bold">
              {convert(report.priceBreakdown?.total ?? report.salePrice)}
            </span>
            <span className="text-[#aaa] line-through text-base">
              {convert(report.originalPrice)}
            </span>
          </div>
          {report.priceBreakdown?.taxAmount > 0 && (
            <p className="text-[11px] text-[#999] mb-1">
              Incl. GST ({report.priceBreakdown.rate}%): {convert(report.priceBreakdown.taxAmount)}
            </p>
          )}
          <p className="text-[#777] text-sm mb-5">{report.shortDescription}</p>
          <div className="border-t border-secondary pt-4">
            <p className="text-primary font-heading text-sm font-bold mb-3">
              What's Included
            </p>
            <ul className="space-y-2">
              {report.benefits?.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start text-sm text-[#444] leading-snug"
                >
                  <DIAMOND />
                  {b.description}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white rounded-2xl border border-secondary p-6 md:p-8 shadow-sm">
          <h3 className="font-heading text-xl text-primary mb-6">
            Your Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {!isMatchMaking ? (
              <>
                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Full Name <span className="text-gold">*</span>
                  </label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Ravi Kumar Sharma"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.fullName ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Email Address <span className="text-gold">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="ravi@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.email ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    WhatsApp Number <span className="text-gold">*</span>
                  </label>
                  <PhoneInput
                    country="in"
                    value={
                      form.whatsapp.startsWith("+")
                        ? form.whatsapp.slice(1)
                        : form.whatsapp
                    }
                    onChange={handlePhoneChange("whatsapp")}
                    enableSearch
                    containerStyle={{ width: "100%" }}
                    inputStyle={getPhoneInputStyle(!!errors.whatsapp)}
                    buttonStyle={getPhoneButtonStyle(!!errors.whatsapp)}
                  />
                  {errors.whatsapp && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.whatsapp}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Date of Birth <span className="text-gold">*</span>
                  </label>
                  <input
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors ${errors.dob ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.dob && (
                    <p className="text-red-500 text-xs mt-1">{errors.dob}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Time of Birth <span className="text-gold">*</span>
                  </label>
                  <input
                    name="timeOfBirth"
                    type="time"
                    value={form.timeOfBirth}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors ${errors.timeOfBirth ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.timeOfBirth && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.timeOfBirth}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Birth Place <span className="text-gold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="birthPlace"
                      value={form.birthPlace}
                      onChange={handlePlaceChange}
                      onBlur={() =>
                        setTimeout(() => setShowDropdown(false), 200)
                      }
                      onFocus={() => {
                        setActivePlaceField("birthPlace");
                        setSuggestions([]);
                        setShowDropdown(false);
                      }}
                      placeholder="Search city or place..."
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.birthPlace ? "border-red-400" : "border-secondary"}`}
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {geoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      ) : form.latitude ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-black/25" />
                      )}
                    </div>
                  </div>
                  {errors.birthPlace && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.birthPlace}
                    </p>
                  )}

                  {showDropdown &&
                    suggestions.length > 0 &&
                    activePlaceField === "birthPlace" && (
                      <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#e0d9f5] rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {suggestions.map((item, i) => (
                          <li
                            key={i}
                            onMouseDown={() => handleSelect(item)}
                            className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-secondary/40 cursor-pointer border-b border-[#f3f0fb] last:border-0 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                            <span className="text-xs text-black/70 leading-relaxed">
                              {item.formattedAddress}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Gender <span className="text-gold">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors appearance-none ${errors.gender ? "border-red-400" : "border-secondary"} ${!form.gender ? "text-[#bbb]" : ""}`}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    {/* <option value="other">Other</option> */}
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-xs mt-1">{errors.gender}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Pin Code <span className="text-gold">*</span>
                  </label>
                  <input
                    name="pinCode"
                    value={form.pinCode}
                    onChange={handleChange}
                    placeholder="110001"
                    maxLength={6}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.pinCode ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.pinCode && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.pinCode}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <div className="mb-4 rounded-2xl border border-secondary bg-[#faf8f4] p-4">
                    <h4 className="font-heading text-lg text-primary mb-2">
                      Bride Details
                    </h4>
                    <p className="text-sm text-[#555]">
                      Enter the bride's details for matchmaking report
                      generation.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Full Name <span className="text-gold">*</span>
                  </label>
                  <input
                    name="brideFullName"
                    value={form.brideFullName}
                    onChange={handleChange}
                    placeholder="Bride Name"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.brideFullName ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.brideFullName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideFullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Email <span className="text-gold">*</span>
                  </label>
                  <input
                    name="brideEmail"
                    type="email"
                    value={form.brideEmail}
                    onChange={handleChange}
                    placeholder="bride@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.brideEmail ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.brideEmail && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride WhatsApp <span className="text-gold">*</span>
                  </label>
                  <PhoneInput
                    country="in"
                    value={
                      form.brideWhatsapp.startsWith("+")
                        ? form.brideWhatsapp.slice(1)
                        : form.brideWhatsapp
                    }
                    onChange={handlePhoneChange("brideWhatsapp")}
                    enableSearch
                    containerStyle={{ width: "100%" }}
                    inputStyle={getPhoneInputStyle(!!errors.brideWhatsapp)}
                    buttonStyle={getPhoneButtonStyle(!!errors.brideWhatsapp)}
                  />
                  {errors.brideWhatsapp && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideWhatsapp}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Date of Birth <span className="text-gold">*</span>
                  </label>
                  <input
                    name="brideDob"
                    type="date"
                    value={form.brideDob}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors ${errors.brideDob ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.brideDob && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideDob}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Time of Birth <span className="text-gold">*</span>
                  </label>
                  <input
                    name="brideTimeOfBirth"
                    type="time"
                    value={form.brideTimeOfBirth}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors ${errors.brideTimeOfBirth ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.brideTimeOfBirth && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideTimeOfBirth}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Birth Place <span className="text-gold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="brideBirthPlace"
                      value={form.brideBirthPlace}
                      onChange={handlePlaceChange}
                      onBlur={() =>
                        setTimeout(() => setShowDropdown(false), 200)
                      }
                      onFocus={() => {
                        setActivePlaceField("brideBirthPlace");
                        setSuggestions([]);
                        setShowDropdown(false);
                      }}
                      placeholder="Search city or place..."
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.brideBirthPlace ? "border-red-400" : "border-secondary"}`}
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {geoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      ) : form.brideLatitude ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-black/25" />
                      )}
                    </div>
                  </div>
                  {errors.brideBirthPlace && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideBirthPlace}
                    </p>
                  )}

                  {showDropdown &&
                    suggestions.length > 0 &&
                    activePlaceField === "brideBirthPlace" && (
                      <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#e0d9f5] rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {suggestions.map((item, i) => (
                          <li
                            key={i}
                            onMouseDown={() => handleSelect(item)}
                            className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-secondary/40 cursor-pointer border-b border-[#f3f0fb] last:border-0 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                            <span className="text-xs text-black/70 leading-relaxed">
                              {item.formattedAddress}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Gender <span className="text-gold">*</span>
                  </label>
                  <select
                    name="brideGender"
                    value={form.brideGender}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors appearance-none ${errors.brideGender ? "border-red-400" : "border-secondary"} ${!form.brideGender ? "text-[#bbb]" : ""}`}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    {/* <option value="other">Other</option> */}
                  </select>
                  {errors.brideGender && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.brideGender}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Bride Pin Code <span className="text-gold">*</span>
                  </label>
                  <input
                    name="bridePinCode"
                    value={form.bridePinCode}
                    onChange={handleChange}
                    placeholder="110001"
                    maxLength={6}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.bridePinCode ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.bridePinCode && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.bridePinCode}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2 mt-6">
                  <div className="mb-4 rounded-2xl border border-secondary bg-[#faf8f4] p-4">
                    <h4 className="font-heading text-lg text-primary mb-2">
                      Groom Details
                    </h4>
                    <p className="text-sm text-[#555]">
                      Enter the groom's details for matchmaking report
                      generation.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Full Name <span className="text-gold">*</span>
                  </label>
                  <input
                    name="groomFullName"
                    value={form.groomFullName}
                    onChange={handleChange}
                    placeholder="Groom Name"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.groomFullName ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.groomFullName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomFullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Email <span className="text-gold">*</span>
                  </label>
                  <input
                    name="groomEmail"
                    type="email"
                    value={form.groomEmail}
                    onChange={handleChange}
                    placeholder="groom@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.groomEmail ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.groomEmail && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom WhatsApp <span className="text-gold">*</span>
                  </label>
                  <PhoneInput
                    country="in"
                    value={
                      form.groomWhatsapp.startsWith("+")
                        ? form.groomWhatsapp.slice(1)
                        : form.groomWhatsapp
                    }
                    onChange={handlePhoneChange("groomWhatsapp")}
                    enableSearch
                    containerStyle={{ width: "100%" }}
                    inputStyle={getPhoneInputStyle(!!errors.groomWhatsapp)}
                    buttonStyle={getPhoneButtonStyle(!!errors.groomWhatsapp)}
                  />
                  {errors.groomWhatsapp && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomWhatsapp}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Date of Birth <span className="text-gold">*</span>
                  </label>
                  <input
                    name="groomDob"
                    type="date"
                    value={form.groomDob}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors ${errors.groomDob ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.groomDob && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomDob}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Time of Birth <span className="text-gold">*</span>
                  </label>
                  <input
                    name="groomTimeOfBirth"
                    type="time"
                    value={form.groomTimeOfBirth}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors ${errors.groomTimeOfBirth ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.groomTimeOfBirth && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomTimeOfBirth}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Birth Place <span className="text-gold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="groomBirthPlace"
                      value={form.groomBirthPlace}
                      onChange={handlePlaceChange}
                      onBlur={() =>
                        setTimeout(() => setShowDropdown(false), 200)
                      }
                      onFocus={() => {
                        setActivePlaceField("groomBirthPlace");
                        setSuggestions([]);
                        setShowDropdown(false);
                      }}
                      placeholder="Search city or place..."
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.groomBirthPlace ? "border-red-400" : "border-secondary"}`}
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {geoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      ) : form.groomLatitude ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-black/25" />
                      )}
                    </div>
                  </div>
                  {errors.groomBirthPlace && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomBirthPlace}
                    </p>
                  )}

                  {showDropdown &&
                    suggestions.length > 0 &&
                    activePlaceField === "groomBirthPlace" && (
                      <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#e0d9f5] rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {suggestions.map((item, i) => (
                          <li
                            key={i}
                            onMouseDown={() => handleSelect(item)}
                            className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-secondary/40 cursor-pointer border-b border-[#f3f0fb] last:border-0 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />
                            <span className="text-xs text-black/70 leading-relaxed">
                              {item.formattedAddress}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Gender <span className="text-gold">*</span>
                  </label>
                  <select
                    name="groomGender"
                    value={form.groomGender}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors appearance-none ${errors.groomGender ? "border-red-400" : "border-secondary"} ${!form.groomGender ? "text-[#bbb]" : ""}`}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    {/* <option value="other">Other</option> */}
                  </select>
                  {errors.groomGender && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomGender}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                    Groom Pin Code <span className="text-gold">*</span>
                  </label>
                  <input
                    name="groomPinCode"
                    value={form.groomPinCode}
                    onChange={handleChange}
                    placeholder="110001"
                    maxLength={6}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] placeholder-[#bbb] outline-none focus:border-primary transition-colors ${errors.groomPinCode ? "border-red-400" : "border-secondary"}`}
                  />
                  {errors.groomPinCode && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.groomPinCode}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs text-primary font-heading mb-1 tracking-wide">
                Report Language <span className="text-gold">*</span>
              </label>
              <select
                name="reportLanguage"
                value={form.reportLanguage}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-[#faf8f4] text-[#222] outline-none focus:border-primary transition-colors appearance-none ${errors.reportLanguage ? "border-red-400" : "border-secondary"} ${!form.reportLanguage ? "text-[#bbb]" : ""}`}
              >
                <option value="" disabled>
                  Select language
                </option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
              {errors.reportLanguage && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.reportLanguage}
                </p>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="mt-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <button
                onClick={() => setForm((p) => ({ ...p, agreed: !p.agreed }))}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  form.agreed
                    ? "bg-primary border-primary"
                    : errors.agreed
                      ? "border-red-400"
                      : "border-secondary group-hover:border-primary/60"
                }`}
              >
                {form.agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span className="text-sm text-[#555]">
                I agree to the{" "}
                <a
                  href="#"
                  className="text-primary underline underline-offset-2 hover:text-gold transition-colors"
                >
                  Terms and Conditions
                </a>{" "}
                <span className="text-gold">*</span>
              </span>
            </label>
            {errors.agreed && (
              <p className="text-red-500 text-xs mt-1 ml-8">{errors.agreed}</p>
            )}
          </div>

          {/* CTA */}
          <div className="mt-7 border-t border-secondary pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#888] mb-0.5">Total Amount</p>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-3xl text-primary">
                  {convert(report.priceBreakdown?.total ?? report.salePrice)}
                </span>
                <span className="text-[#bbb] line-through text-sm">
                  {convert(report.originalPrice)}
                </span>
              </div>
              {report.priceBreakdown?.taxAmount > 0 && (
                <p className="text-[11px] text-[#999] mt-0.5">
                  {convert(report.priceBreakdown.base)} + GST ({report.priceBreakdown.rate}%): {convert(report.priceBreakdown.taxAmount)}
                </p>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className="relative overflow-hidden bg-primary hover:bg-[#3b3f63] active:scale-[0.98] disabled:opacity-70 text-white font-heading text-base px-8 py-3.5 rounded-xl transition-all group"
            >
              <span className="relative z-10 flex items-center gap-2">
                {btnState === "buying" ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Creating Order...
                  </>
                ) : btnState === "verifying" ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="group-hover:translate-x-1 transition-transform"
                    >
                      <path
                        d="M3 8H13M13 8L9 4M13 8L9 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
