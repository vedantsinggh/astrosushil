/* eslint-disable no-unused-vars */
import { create } from "zustand";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const INQUIRY_URL = `${BASE_URL}/inquiry`;
const BLOG_URL = `${BASE_URL}/blogs`;
const TESTIMONIAL_URL = `${BASE_URL}/testimonial`;
const NEWSLETTER_URL = `${BASE_URL}/newsletter`;
const BANNER_URL = `${BASE_URL}/banners`;
const SEO_URL = `${BASE_URL}/seo`;
const SETTINGS_URL = `${BASE_URL}/settings`;
const FAQ_URL = `${BASE_URL}/faqs`;
const MEDIA_URL = `${BASE_URL}/media`;
const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const useSettingStore = create((set) => ({
  loading: false,
  error: null,
  blogs: [],
  blog: null,

  seo: null,

  fetchSeoByPage: async (name) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(`${SEO_URL}/${name}`);

      set({
        seo: res.data?.data || null,
      });

      return res.data?.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch seo data",
      });

      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchBlogs: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(BLOG_URL, { params });

      set({
        blogs: res.data?.data?.blogs || [],
      });
    } catch (err) {
      set({ error: err.response?.data?.message || "" });
    } finally {
      set({ loading: false });
    }
  },

  fetchBlogBySlug: async (slug) => {
    try {
      set({ loading: true, error: null });
      const res = await axios.get(`${BLOG_URL}/slug/${slug}`);
      set({ blog: res.data.data });
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to fetch blog" });
    } finally {
      set({ loading: false });
    }
  },
  banners: [],

  fetchFrontendBanners: async (page = "home") => {
    try {
      set({ loading: true, error: null });

      let responseData = null;

      if (page === "home" && window.__heroBanners) {
        const preloaded = await window.__heroBanners;
        window.__heroBanners = null;
        if (preloaded?.data) responseData = preloaded.data;
      }

      if (!responseData) {
        const res = await axios.get(`${BANNER_URL}/frontend`, { params: { page } });
        responseData = res.data?.data;
      }

      set({
        banners:
          page === "home"
            ? responseData?.sliders || []
            : responseData?.banner
              ? [responseData.banner]
              : [],
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch banners",
      });
    } finally {
      set({ loading: false });
    }
  },

  testimonials: [],
  testimonial: null,

  fetchTestimonials: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(TESTIMONIAL_URL, { params });

      set({
        testimonials: res.data?.data?.items || [],
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch testimonials",
      });
    } finally {
      set({ loading: false });
    }
  },
  fetchTestimonialById: async (id) => {
    try {
      set({ loading: true, error: null });
      const res = await axios.get(`${TESTIMONIAL_URL}/${id}`);
      set({ testimonial: res.data });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch testimonial",
      });
    } finally {
      set({ loading: false });
    }
  },

  createInquiry: async (payload) => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(INQUIRY_URL, payload, { headers });
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data || "Failed to submit inquiry";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  settings: null,

  fetchSettings: async () => {
    try {
      set({ loading: true, error: null });
      const res = await axios.get(`${BASE_URL}/settings`);
      set({ settings: res.data?.data || null });
      return res.data?.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to fetch settings" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  faqs: [],
  faq: null,

  fetchFAQs: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(FAQ_URL, { params });

      set({
        faqs: res.data?.data || [],
      });

      return res.data?.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch FAQs",
      });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  fetchFAQsByPage: async (page) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(FAQ_URL, {
        params: { page },
      });

      set({
        faqs: res.data?.data || [],
      });

      return res.data?.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch FAQs",
      });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  fetchFAQById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(`${FAQ_URL}/${id}`);

      set({
        faq: res.data?.data || null,
      });

      return res.data?.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch FAQ",
      });
      return null;
    } finally {
      set({ loading: false });
    }
  },
  media: [],
  singleMedia: null,
  fetchMedia: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(MEDIA_URL, { params });

      set({
        media: Array.isArray(res.data?.data)
          ? res.data.data
          : res.data?.data?.items || [],
      });

      return res.data?.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch media",
      });

      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchMediaById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(`${MEDIA_URL}/${id}`);

      set({
        singleMedia: res.data?.data || null,
      });

      return res.data?.data;
    } catch (err) {
      set({
        error: err.response?.data?.message || "Failed to fetch media details",
      });

      return null;
    } finally {
      set({ loading: false });
    }
  },
}));
