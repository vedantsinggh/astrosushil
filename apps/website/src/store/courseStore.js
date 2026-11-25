import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const COURSE_URL = `${BASE_URL}/course-links`;

export const useCourseStore = create((set) => ({
  courses: [],
  course: null,
  loading: false,
  error: null,

  getCourses: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(COURSE_URL, { params });
      const raw = res.data?.data;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);

      set({
        courses: list,
      });

      return {
        success: true,
        data: list,
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to fetch courses";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  getCourseById: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(`${COURSE_URL}/${id}`);

      set({
        course: res.data?.data || null,
      });

      return {
        success: true,
        data: res.data?.data,
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to fetch course";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  getCourseBySlug: async (slug) => {
  try {
    set({ loading: true, error: null });

    const res = await axios.get(`${COURSE_URL}/slug/${slug}`);

    set({
      course: res.data?.data || null,
    });

    return {
      success: true,
      data: res.data?.data,
    };
  } catch (err) {
    showError(err);

    const message =
      err.response?.data?.message || "Failed to fetch course";

    set({ error: message });

    return {
      success: false,
      error: message,
    };
  } finally {
    set({ loading: false });
  }
},
  clearCourse: () => {
    set({ course: null });
  },
}));
