

import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const useDownloadStore = create((set) => ({
  downloads: [],
  loading: false,
  error: null,

  getDownloads: async () => {
    try {
      set({
        loading: true,
        error: null,
      });

      const token = localStorage.getItem("token");

      const res = await axios.get(`${BASE_URL}/account/downloads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      set({
        downloads: res.data?.data?.items || res.data?.data || [],
      });

      return {
        success: true,
      };
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to fetch downloads";

      set({
        error: msg,
      });

      return {
        success: false,
        error: msg,
      };
    } finally {
      set({
        loading: false,
      });
    }
  },

  getSignedDownloadUrl: async (downloadId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/account/downloads/${downloadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const url = res.data?.data?.url || res.data?.data?.file || res.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return { success: true, url };
    } catch (err) {
      showError(err);
      return {
        success: false,
        error: err?.response?.data?.error?.message || err?.response?.data?.message || "Download failed",
      };
    }
  },
}));
