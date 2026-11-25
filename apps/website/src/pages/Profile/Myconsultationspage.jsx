/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Video,
  Search,
  X,
  FileText,
  RotateCcw,
  Calendar,
  Clock,
  Hash,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  ChevronRight,
  Package,
} from "lucide-react";
import { useConsultationStore } from "../../store/useConsultationStore";

const STATUS = {
  completed: {
    label: "Completed",
    icon: <CheckCircle2 size={11} />,
    pill: "bg-green-100 text-green-700 border-green-200",
    bar: "bg-green-500",
  },
  upcoming: {
    label: "Upcoming",
    icon: <Timer size={11} />,
    pill: "bg-blue-50 text-blue-600 border-blue-200",
    bar: "bg-blue-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle size={11} />,
    pill: "bg-red-50 text-red-500 border-red-200",
    bar: "bg-red-400",
  },
  pending: {
    label: "Pending",
    icon: <AlertCircle size={11} />,
    pill: "bg-amber-50 text-amber-600 border-amber-200",
    bar: "bg-amber-400",
  },
};

const CALL_ICONS = {
  "Voice Call": <Phone size={10} />,
  "Video Call": <Video size={10} />,
};

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Avatar({ name, src, size = 48 }) {
  const initials = name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover border-2 border-primary/20 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0 font-heading font-bold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.33 }}
    >
      {initials}
    </div>
  );
}
function normaliseBooking(b) {
  const modeMap = {
    audio: "Voice Call",
    video: "Video Call",
  };

  // date: "28-05-2026" → parse for display
  const [day, month, year] = (b.date || "").split("-");
  const scheduledDate = b.date ? `${year}-${month}-${day}` : null; // → ISO for fmtDate

  // slot: "11:20-11:50" → show start time
  const scheduledTime = b.slot ? b.slot.split("-")[0] : "—";

  return {
    id: b._id,
    bookingId: `#${b._id.slice(-8).toUpperCase()}`,
    name: b.consultationId?.title || "Consultation",
    astrologer: {
      name: "Astro Sushil",
      avatar: null,
    },
    mode: b.mode,
    callType: modeMap[b.mode] || "Voice Call",
    bookedOn: b.createdAt,
    scheduledDate,
    scheduledTime,
    duration: b.duration,
    status: b.status === "booked" ? "upcoming" : b.status,
    amount: b.amount || b.price?.inr || 0,
  };
}

function ConsultationCard({ item, index }) {
  const st = STATUS[item.status] || STATUS.pending;
  const { downloadBookingInvoice } = useConsultationStore();
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleInvoice = async () => {
    setInvoiceLoading(true);
    await downloadBookingInvoice(item.id);
    setInvoiceLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="bg-white rounded-2xl border border-black/8 shadow-sm hover:shadow-md hover:border-primary/15 transition-all duration-300 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-stretch">
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 sm:p-5 flex-1 min-w-0">
          <div className="flex items-start gap-3 sm:min-w-50 sm:max-w-55">
            <Avatar
              name={item.astrologer.name}
              src={item.astrologer.avatar}
              size={44}
            />
            <div className="min-w-0">
              <p className="font-heading font-bold text-primary text-sm leading-snug line-clamp-2">
                {item.name}
              </p>
              <p className="text-[11px] font-body text-black/40 mt-0.5 truncate">
                {item.astrologer.name}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-body font-medium border border-primary/15">
                {CALL_ICONS[item.callType]}
                {item.callType}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-x-6 gap-y-3 flex-1 min-w-0">
            <div className="min-w-22.5">
              <p className="text-[9px] font-body font-bold text-black/30 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Hash size={9} /> Booking ID
              </p>
              <p className="text-xs font-body font-medium text-primary">
                {item.bookingId}
              </p>
            </div>

            <div className="min-w-22.5">
              <p className="text-[9px] font-body font-bold text-black/30 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Calendar size={9} /> Booked On
              </p>
              <p className="text-xs font-body font-medium text-primary">
                {fmtDate(item.bookedOn)}
              </p>
            </div>

            <div className="min-w-30">
              <p className="text-[9px] font-body font-bold text-black/30 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Calendar size={9} /> Scheduled Date
              </p>
              <p className="text-xs font-body font-medium text-primary">
                {fmtDate(item.scheduledDate)}
              </p>
              <p className="text-[10px] font-body text-black/40">
                {item.scheduledTime} ({item.duration} mins)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-row sm:flex-col items-center sm:items-center justify-between sm:justify-start gap-3 bg-primary px-5 py-4 sm:min-w-40 shrink-0 rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-body font-bold ${st.pill}`}
          >
            {st.icon}
            {st.label}
          </span>

          <p className="font-heading font-bold text-white text-xl sm:text-2xl">
            ₹{item.amount.toLocaleString("en-IN")}
          </p>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleInvoice}
              disabled={invoiceLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold text-white font-body text-[11px] font-medium hover:bg-gold cursor-pointer transition-colors duration-700 disabled:opacity-60"
            >
              {invoiceLoading && (
                <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
              )}
              Invoice
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold text-white font-body text-[11px] font-medium hover:bg-gold cursor-pointer transition-colors duration-700 disabled:opacity-60"
            >
              {/* <RotateCcw size={11} />  */}
              Book Again
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-black/8 overflow-hidden animate-pulse">
      <div className="h-0.5 bg-black/8" />
      <div className="flex items-center gap-4 p-5">
        <div className="w-11 h-11 rounded-full bg-black/8 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-black/8 rounded-full w-1/2" />
          <div className="h-3 bg-black/5 rounded-full w-1/3" />
        </div>
        <div className="hidden sm:flex gap-6 flex-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2 bg-black/5 rounded w-16" />
              <div className="h-3 bg-black/8 rounded w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-2 items-end flex flex-col">
          <div className="h-6 w-20 bg-black/8 rounded-full" />
          <div className="h-7 w-16 bg-black/5 rounded" />
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-black/8 rounded-xl" />
            <div className="h-7 w-20 bg-black/8 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

export default function MyConsultationsPage() {
  const { myBookings, myBookingsLoading, getMyBookings } =
    useConsultationStore();

  useEffect(() => {
    getMyBookings();
  }, []);

  const consultations = useMemo(
    () => myBookings.map(normaliseBooking),
    [myBookings],
  );
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const loading = false;

  const filtered = useMemo(() => {
    let list = consultations;
    if (activeTab !== "All") {
      list = list.filter((c) => c.status === activeTab.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.bookingId.toLowerCase().includes(q) ||
          c.astrologer.name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [consultations, activeTab, search]);

  return (
    <main className="min-h-screen">
      <div className="max-w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6 flex-wrap"
          role="tablist"
        >
          {FILTERS.map((tab) => {
            const count =
              tab === "All"
                ? consultations.length
                : consultations.filter((c) => c.status === tab.toLowerCase())
                    .length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-body font-medium border transition-all duration-700 focus-visible:outline-none
                  ${
                    isActive
                      ? "bg-gold text-white border-gold hover:bg-primary hover:text-white shadow-sm shadow-primary/20"
                      : "bg-primary text-white border-primary hover:border-gold hover:bg-gold hover:text-white"
                  }`}
              >
                {tab}
                <span
                  className={`min-w-4.5 h-4 px-1 rounded-full text-[10px] flex items-center justify-center font-bold
                  ${isActive ? "bg-white/20 text-white" : "bg-white/8 text-white/40"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/40 flex items-center justify-center">
              <Package size={26} className="text-primary/30" />
            </div>
            <p className="font-heading font-medium text-primary/50 text-lg">
              No consultations found
            </p>
            <p className="text-sm font-body text-black/35">
              {search
                ? "Try a different search term"
                : "You have no consultations in this category"}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-1 px-5 py-2 rounded-xl bg-primary text-white text-sm font-body hover:bg-primary/85 transition-colors"
              >
                Clear search
              </button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${search}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {filtered.map((item, i) => (
                <ConsultationCard key={item.id} item={item} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
