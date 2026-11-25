import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const CONSULTATION_URL = `${BASE_URL}/consultation`;

const BOOKING_URL = `${BASE_URL}/consultation`;

const normalizeConsultation = (c) => {
  if (!c) return c;
  return {
    ...c,
    _id: c._id ?? c.id,
    duration: c.duration ?? c.durationMinutes,
    modes: Array.isArray(c.modes)
      ? c.modes.map((m, idx) => ({
          ...m,
          _id: m._id ?? m.catalogId ?? String(idx),
          mode: String(m.mode || "").toLowerCase(),
          price: m.price ?? (m.pricePaise != null ? m.pricePaise / 100 : 0),
          priceWithGst:
            m.priceWithGst ??
            (m.priceWithGstPaise != null
              ? m.priceWithGstPaise / 100
              : m.pricePaise != null
                ? m.pricePaise / 100
                : 0),
        }))
      : [],
  };
};

export const useConsultationStore = create((set) => ({
  consultations: [],
  consultation: null,
  slots: [],
  myBookings: [],

  consultationsLoading: false,
  consultationLoading: false,
  slotsLoading: false,

  bookingLoading: false,
  myBookingsLoading: false,
  paymentVerificationLoading: false,

  error: null,
  getConsultations: async (params = {}) => {
    try {
      set({
        consultationsLoading: true,
        error: null,
      });

      const res = await axios.get(`${CONSULTATION_URL}/types`, {
        params,
      });

      const list = (res.data?.data || []).map(normalizeConsultation);

      set({
        consultations: list,
      });

      return {
        success: true,
        data: list,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Failed to fetch consultations";

      set({
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({
        consultationsLoading: false,
      });
    }
  },

  getConsultationById: async (id) => {
    try {
      set({
        consultationLoading: true,
        error: null,
      });

      const res = await axios.get(`${CONSULTATION_URL}/types/${id}`);

      const item = normalizeConsultation(res.data?.data || null);

      set({
        consultation: item,
      });

      return {
        success: true,
        data: item,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Failed to fetch consultation";

      set({
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({
        consultationLoading: false,
      });
    }
  },

  getSlots: async (params = {}) => {
    try {
      set({
        slotsLoading: true,
        error: null,
      });

      const res = await axios.get(`${CONSULTATION_URL}/slots`, {
        params,
      });

      set({
        slots: res.data?.data || [],
      });

      return {
        success: true,

        data: res.data?.data || [],

        message: res.data?.message,
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to fetch slots";

      set({
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({
        slotsLoading: false,
      });
    }
  },

  createUserBooking: async (payload) => {
    try {
      set({
        bookingLoading: true,
        error: null,
      });

      const res = await axios.post(`${BOOKING_URL}/book`, payload);

      return {
        success: true,

        data: res.data?.data,

        message: res.data?.message,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Failed to book consultation";

      set({
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({
        bookingLoading: false,
      });
    }
  },

  verifyConsultationPayment: async (payload) => {
    try {
      set({
        paymentVerificationLoading: true,
        error: null,
      });

      const res = await axios.post(`${BOOKING_URL}/verify-payment`, payload);

      return {
        success: true,

        data: res.data?.data,

        message: res.data?.message,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Payment verification failed";

      set({
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({
        paymentVerificationLoading: false,
      });
    }
  },

  getMyBookings: async (params = {}) => {
    try {
      set({
        myBookingsLoading: true,
        error: null,
      });

      const res = await axios.get(`${BOOKING_URL}/my-bookings`, { params });

      set({
        myBookings: res.data?.data || [],
      });

      return {
        success: true,
        data: res.data?.data || [],
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to fetch bookings";

      set({
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({
        myBookingsLoading: false,
      });
    }
  },
  downloadBookingInvoice: async (bookingId, orderId) => {
    try {
      let resolvedOrderId = orderId;

      if (!resolvedOrderId) {
        const infoRes = await axios.get(
          `${BOOKING_URL}/my-bookings/${bookingId}/invoice`,
          { withCredentials: true },
        );
        resolvedOrderId = infoRes.data?.data?.orderId ?? infoRes.data?.orderId;
      }

      if (!resolvedOrderId) {
        toast.error("Invoice PDF is not available for this booking.");
        return { success: false };
      }

      const res = await axios.get(
        `${BASE_URL}/invoices/orders/${resolvedOrderId}/pdf`,
        { withCredentials: true, responseType: "blob" },
      );

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      showError(err);
      return { success: false };
    }
  },

  cancelBooking: async (bookingId, reason = "") => {
    try {
      const res = await axios.post(
        `${BOOKING_URL}/bookings/${bookingId}/cancel`,
        reason ? { reason } : {},
      );
      const updated = res.data?.data;
      set((state) => ({
        myBookings: state.myBookings.map((b) =>
          (b.id ?? b._id) === bookingId
            ? { ...b, ...(updated || {}), status: updated?.status ?? "cancelled" }
            : b,
        ),
      }));
      toast.success("Consultation cancelled successfully.");
      return { success: true, data: updated };
    } catch (err) {
      showError(err);
      return {
        success: false,
        error: err.response?.data?.message || "Failed to cancel booking",
      };
    }
  },

  clearConsultation: () => {
    set({
      consultation: null,
      slots: [],
    });
  },
}));
