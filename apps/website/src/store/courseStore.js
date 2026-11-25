import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const COURSE_URL = `${BASE_URL}/course-links`;

const normalizeCourse = (c) => {
  if (!c || typeof c !== "object") return c;
  return {
    ...c,
    _id: c._id ?? c.id,
    price: c.price ?? (c.pricePaise != null ? c.pricePaise / 100 : 0),
    originalPrice:
      c.originalPrice ??
      (c.originalPricePaise != null ? c.originalPricePaise / 100 : null),
  };
};

export const useCourseStore = create((set) => ({
  courses: [],
  course: null,
  loading: false,
  error: null,

  getCourses: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const safeParams =
        params.limit !== undefined
          ? { ...params, limit: Math.min(Number(params.limit) || 50, 200) }
          : params;
      const res = await axios.get(COURSE_URL, { params: safeParams });
      const raw = res.data?.data;
      const list = (Array.isArray(raw) ? raw : (raw?.items || [])).map(normalizeCourse);

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

      const item = normalizeCourse(res.data?.data || null);
      set({
        course: item,
      });

      return {
        success: true,
        data: item,
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

    const item = normalizeCourse(res.data?.data || null);
    set({
      course: item,
    });

    return {
      success: true,
      data: item,
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
