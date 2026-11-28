

import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

import { API_BASE_URL as BASE_URL } from "../config/api";

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

      const res = await axios.get(`${BASE_URL}/account/downloads`, {
        withCredentials: true,
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
      const res = await axios.get(`${BASE_URL}/account/downloads/${downloadId}`, {
        withCredentials: true,
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
