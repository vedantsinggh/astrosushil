import { create } from "zustand";
import axios from "axios";
import { showError, showSuccess } from "../utils/toast";
import { useAuthStore } from "./useAuthStore";

const BASE_URL = import.meta.env.VITE_API_URL;
const REPORT_URL = `${BASE_URL}/report`;

const useReportStore = create((set, get) => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    console.log("Auth Token:", token);

    if (!token) return {};

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  return {
    reports: [],
    report: null,
    reportOrders: [],
    loading: false,
    buying: false,
    verifying: false,
    error: null,

    getReports: async (params = {}) => {
      try {
        set({ loading: true, error: null });

        const res = await axios.get(REPORT_URL, { params });

        set({
          reports: res.data?.data || [],
        });

        return {
          success: true,
          data: res.data?.data || [],
        };
      } catch (err) {
        showError(err);

        const message =
          err.response?.data?.message || "Failed to fetch reports";

        set({ error: message });

        return {
          success: false,
          error: message,
        };
      } finally {
        set({ loading: false });
      }
    },

    getReportById: async (id) => {
      try {
        set({ loading: true, error: null });

        const res = await axios.get(`${REPORT_URL}/${id}`);

        set({
          report: res.data?.data || null,
        });

        return {
          success: true,
          data: res.data?.data,
        };
      } catch (err) {
        showError(err);

        const message = err.response?.data?.message || "Failed to fetch report";

        set({ error: message });

        return {
          success: false,
          error: message,
        };
      } finally {
        set({ loading: false });
      }
    },

    getReportBySlug: async (slug) => {
      try {
        set({ loading: true, error: null });

        const res = await axios.get(`${REPORT_URL}/slug/${slug}`);

        set({
          report: res.data?.data || null,
        });

        return {
          success: true,
          data: res.data?.data,
        };
      } catch (err) {
        showError(err);

        const message = err.response?.data?.message || "Failed to fetch report";

        set({ error: message });

        return {
          success: false,
          error: message,
        };
      } finally {
        set({ loading: false });
      }
    },

    getReportOrders: async () => {
      try {
        set({ loading: true, error: null });

        const res = await axios.get(`${REPORT_URL}/orders`, getAuthHeaders());

        set({
          reportOrders: res.data?.data || [],
        });

        return {
          success: true,
          data: res.data?.data || [],
        };
      } catch (err) {
        showError(err);

        const message =
          err.response?.data?.message || "Failed to fetch reports";

        set({ error: message });

        return {
          success: false,
          error: message,
        };
      } finally {
        set({ loading: false });
      }
    },

    buyReport: async (payload) => {
      try {
        set({ buying: true, error: null });

        const headers = getAuthHeaders();
        if (!headers.headers?.Authorization) {
          alert("Please login to buy the report");
          return { success: false, error: "Not authenticated" };
        }

        const res = await axios.post(`${REPORT_URL}/buy`, payload, headers);

        return {
          success: true,
          data: res.data?.data,
        };
      } catch (err) {
        showError(err);
        const message = err.response?.data?.message || "Failed to buy report";
        set({ error: message });
        return { success: false, error: message };
      } finally {
        set({ buying: false });
      }
    },

    verifyReportPayment: async (paymentData) => {
      try {
        set({
          verifying: true,
          error: null,
        });

        const res = await axios.post(
          `${REPORT_URL}/verify-payment`,
          paymentData,
          getAuthHeaders(),
        );

        showSuccess("Payment verified successfully");

        return {
          success: true,
          data: res.data?.data,
        };
      } catch (err) {
        showError(err);

        const message =
          err.response?.data?.message || "Payment verification failed";

        set({ error: message });

        return {
          success: false,
          error: message,
        };
      } finally {
        set({ verifying: false });
      }
    },

    downloadReportInvoice: async (orderId) => {
      try {
        const headers = getAuthHeaders();

        const response = await axios.get(
          `${REPORT_URL}/orders/${orderId}/invoice`,
          {
            ...headers,
            responseType: "blob",
          },
        );

        const blob = new Blob([response.data], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", `report-invoice-${orderId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        return { success: true };
      } catch (err) {
        showError(err);
        const message =
          err.response?.data?.message || "Failed to download invoice";
        return { success: false, error: message };
      }
    },

    clearReport: () => {
      set({ report: null });
    },
  };
});

export default useReportStore;
