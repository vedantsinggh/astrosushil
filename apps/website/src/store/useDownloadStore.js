

import { create } from "zustand";
import axios from "axios";

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
}));
