import { create } from "zustand";
import axios from "axios";
import { showError, showSuccess } from "../utils/toast";
import { useAuthStore } from "./useAuthStore";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const REPORT_URL = `${BASE_URL}/report`;

const FALLBACK_COVER_IMAGES = {
  "mini-horoscope": "/Image/Reports/mini-horscope.webp",
  "basic-horoscope": "/Image/Reports/basic-horscope.webp",
  "pro-horoscope": "/Image/Reports/pro-horscope.webp",
  "match-making": "/Image/Reports/match-making.webp",
};

const withReportCover = (r) => {
  if (!r || typeof r !== "object") return r;
  return {
    ...r,
    coverImage: r.coverImage || FALLBACK_COVER_IMAGES[r.slug] || "/Image/Reports.webp",
  };
};

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

        const list = (res.data?.data || []).map(withReportCover);

        set({
          reports: list,
        });

        return {
          success: true,
          data: list,
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

        const item = withReportCover(res.data?.data || null);

        set({
          report: item,
        });

        return {
          success: true,
          data: item,
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

        const item = withReportCover(res.data?.data || null);

        set({
          report: item,
        });

        return {
          success: true,
          data: item,
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
