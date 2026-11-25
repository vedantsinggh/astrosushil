import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const CONSULTATION_URL = `${BASE_URL}/consultation`;

const BOOKING_URL = `${BASE_URL}/consultation`;

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

      set({
        consultations: res.data?.data || [],
      });

      return {
        success: true,
        data: res.data?.data || [],
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

      set({
        consultation: res.data?.data || null,
      });

      return {
        success: true,
        data: res.data?.data,
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

  createUserBooking: async (payload, token) => {
    try {
      set({
        bookingLoading: true,
        error: null,
      });

      const res = await axios.post(`${BOOKING_URL}/book`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  verifyConsultationPayment: async (payload, token) => {
    try {
      set({
        paymentVerificationLoading: true,
        error: null,
      });

      const res = await axios.post(`${BOOKING_URL}/verify-payment`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

      const token = localStorage.getItem("token"); // ✅ SAME as payment store

      if (!token) {
        set({
          error: "Not authenticated",
          myBookingsLoading: false,
        });

        return {
          success: false,
          error: "Not authenticated",
        };
      }

      const res = await axios.get(`${BOOKING_URL}/my-bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

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
  downloadBookingInvoice: async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BOOKING_URL}/my-bookings/${bookingId}/invoice`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
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

  clearConsultation: () => {
    set({
      consultation: null,
      slots: [],
    });
  },
}));
