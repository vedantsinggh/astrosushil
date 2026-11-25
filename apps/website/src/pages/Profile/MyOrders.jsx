/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect } from "react";
import {
  Package, Download, Eye, Calendar, RefreshCw, XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePaymentStore } from "../../store/usePaymentStore";
import Pagination from "../../components/Pagination";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 4;

const STATUS_STYLES = {
  delivered:  { dot: "bg-green-500",  text: "text-green-600",  label: "Delivered" },
  confirmed:  { dot: "bg-teal-500",   text: "text-teal-600",   label: "Confirmed" },
  processing: { dot: "bg-amber-400",  text: "text-amber-600",  label: "Processing" },
  shipped:    { dot: "bg-blue-400",   text: "text-blue-600",   label: "Shipped" },
  cancelled:  { dot: "bg-red-400",    text: "text-red-500",    label: "Cancelled" },
  pending:    { dot: "bg-gray-400",   text: "text-gray-500",   label: "Pending" },
  paid:       { dot: "bg-green-500",  text: "text-green-600",  label: "Paid" },
};

const getStatusStyle = (status) =>
  STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.pending;

const fmt = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const fmtPrice = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n ?? 0);

const normalizeOrder = (o) => {
  const firstItem = o.items?.[0];
  const productImage =
    firstItem?.image ||
    firstItem?.product?.thumbnail ||
    firstItem?.product?.images?.[0] ||
    null;

  const productName =
    firstItem?.name ||
    firstItem?.product?.name ||
    o.productName ||
    "Order";

  const status =
    o.orderStatus ||
    o.payment?.status ||
    o.paymentStatus ||
    "pending";

  return {
    _id: o._id,
    orderNumber: `#${o._id?.slice(-10).toUpperCase()}`,
    productName,
    image: productImage,
    orderDate: o.createdAt,
    deliveryDate: o.deliveryDate || null,
    originalPrice: firstItem?.mrp || o.totalAmount || 0,
    finalPrice: o.totalAmount ?? o.amount ?? 0,
    status: status.toLowerCase(),
    itemCount: o.items?.length ?? 1,
    paymentMethod: o.payment?.method || o.paymentMethod || "—",
    orderType: o.orderType,
  };
};

const TABS = [
  { key: "all",     label: "All"     },
  { key: "today",   label: "Today"   },
  { key: "monthly", label: "Monthly" },
  { key: "yearly",  label: "Yearly"  },
];

function StatusBadge({ status }) {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function OrderCard({ order, onDownload, onView, downloading }) {
  return (
    <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow duration-200">
      <div className="sm:w-36 sm:h-auto h-44 shrink-0 bg-gray-100 overflow-hidden">
        {order.image ? (
          <img
            src={order.image}
            alt={order.productName}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-gray-300" />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 sm:p-5 gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-black text-[15px] leading-snug line-clamp-2 flex-1">
            {order.productName}
          </h3>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
          <div>
            <p className="text-[10px] text-black/40 font-body uppercase tracking-wider">Order No.</p>
            <p className="text-[12px] text-black font-semibold font-body">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-black/40 font-body uppercase tracking-wider">Order Date</p>
            <p className="text-[13px] text-black font-body">{fmt(order.orderDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-black/40 font-body uppercase tracking-wider">Delivery Date</p>
            <p className="text-[13px] text-black font-body">
              {order.deliveryDate ? fmt(order.deliveryDate) : "To be updated"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-black/40 font-body uppercase tracking-wider">Payment</p>
            <p className="text-[13px] text-black font-body uppercase">{order.paymentMethod}</p>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-black/6">
          <div className="flex items-baseline gap-2">
            {order.originalPrice > order.finalPrice && (
              <span className="text-black/35 text-sm font-body line-through">
                {fmtPrice(order.originalPrice)}
              </span>
            )}
            <span className="text-primary font-heading text-lg font-bold">
              {fmtPrice(order.finalPrice)}
            </span>
            {order.itemCount > 1 && (
              <span className="text-[11px] text-black/40 font-body">
                ({order.itemCount} items)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onView(order)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-medium font-body hover:bg-gold active:scale-[0.97] transition-all duration-700 cursor-pointer focus-visible:outline-none"
            >
              <Eye size={13} />
              View Details
            </button>
            <button
              onClick={() => onDownload(order)}
              disabled={downloading === order._id}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-medium font-body hover:bg-gold active:scale-[0.97] transition-all duration-700 cursor-pointer focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading === order._id ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden flex flex-col sm:flex-row animate-pulse">
      <div className="sm:w-36 h-44 sm:h-auto shrink-0 bg-gray-100" />
      <div className="flex flex-col flex-1 p-5 gap-4">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 bg-gray-100 rounded w-2/3" />
              <div className="h-3.5 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-1 border-t border-black/6">
          <div className="h-6 bg-gray-100 rounded w-24" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-100 rounded-xl w-24" />
            <div className="h-8 bg-gray-100 rounded-xl w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [tab,         setTab]    = useState("all");
  const [dateVal,     setDateVal] = useState("");
  const [page,        setPage]   = useState(1);
  const [downloading, setDl]     = useState(null);

  const { orders, ordersLoading, ordersError, getOrders, downloadInvoice } =
    usePaymentStore();

  useEffect(() => { getOrders(); }, []);

  const normalized = useMemo(
    () => (Array.isArray(orders) ? orders.map(normalizeOrder) : []),
    [orders],
  );

  const filtered = useMemo(() => {
    let list = normalized;

    // Specific date overrides tab
    if (dateVal) {
      return list.filter((o) =>
        o.orderDate &&
        new Date(o.orderDate).toISOString().split("T")[0] === dateVal
      );
    }

    const now = new Date();

    if (tab === "today") {
      const today = now.toISOString().split("T")[0];
      list = list.filter((o) =>
        o.orderDate &&
        new Date(o.orderDate).toISOString().split("T")[0] === today
      );
    } else if (tab === "monthly") {
      list = list.filter((o) => {
        if (!o.orderDate) return false;
        const d = new Date(o.orderDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    } else if (tab === "yearly") {
      list = list.filter((o) =>
        o.orderDate && new Date(o.orderDate).getFullYear() === now.getFullYear()
      );
    }

    return list;
  }, [normalized, tab, dateVal]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleTab = (key) => { setTab(key); setDateVal(""); setPage(1); };
  const handleDate = (e) => { setDateVal(e.target.value); setTab("all"); setPage(1); };

  const handleView = (order) => navigate(`/dashboard/orders/${order._id}`);

  const handleDownload = async (order) => {
    try {
      setDl(order._id);
      const result = await downloadInvoice(order._id);
      if (result?.error) toast?.error?.(result.error);
    } catch {
      toast?.error?.("Failed to download invoice. Please try again.");
    } finally {
      setDl(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fadeIn min-h-screen">

      {/* ── Tabs + date picker ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTab(t.key)}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium font-body transition-all duration-700 cursor-pointer focus-visible:outline-none
                ${tab === t.key && !dateVal
                  ? "bg-gold text-white border-gold shadow-sm"
                  : "bg-primary hover:bg-gold text-white"}`}
            >
              {t.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => getOrders()}
            disabled={ordersLoading}
            title="Refresh orders"
            className="px-3 py-2 rounded-xl text-[13px] font-semibold font-body border border-primary/30 text-primary hover:bg-primary bg-white hover:text-white transition-all duration-700 cursor-pointer disabled:opacity-50 focus-visible:outline-none"
          >
            <RefreshCw size={14} className={ordersLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="relative">
          <label className="absolute -top-2.5 left-3 px-1 text-[10px] font-body bg-secondary text-black/40 tracking-wider z-10">
            Date Filter
          </label>
          <div className="flex items-center gap-2 border border-black/15 rounded-xl px-3 py-2.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all duration-200">
            <Calendar size={14} className="text-black/30 shrink-0" />
            <input
              type="date"
              value={dateVal}
              onChange={handleDate}
              className="text-[13px] font-body text-black bg-transparent outline-none cursor-pointer"
            />
            {dateVal && (
              <button
                type="button"
                onClick={() => { setDateVal(""); setPage(1); }}
                className="text-black/30 hover:text-black transition-colors text-xs ml-1 cursor-pointer"
                aria-label="Clear date"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {ordersError && !ordersLoading && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-body">
          <XCircle size={16} className="shrink-0" />
          {ordersError}
          <button
            type="button"
            onClick={() => getOrders()}
            className="ml-auto text-red-500 underline text-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Skeleton ──────────────────────────────────────────────────── */}
      {ordersLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!ordersLoading && !ordersError && paginated.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={40} className="text-primary/20" />
          <p className="font-heading text-black/30 text-lg">No orders found</p>
          <p className="text-black/25 text-sm font-body">
            {tab !== "all" || dateVal
              ? "Try a different filter or date"
              : "You haven't placed any orders yet"}
          </p>
        </div>
      )}

      {/* ── Order cards ───────────────────────────────────────────────── */}
      {!ordersLoading && paginated.length > 0 && (
        <div className="flex flex-col gap-4">
          {paginated.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onDownload={handleDownload}
              onView={handleView}
              downloading={downloading}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {!ordersLoading && totalPages > 1 && (
        <Pagination current={page} total={totalPages} onChange={setPage} />
      )}
    </div>
  );
}