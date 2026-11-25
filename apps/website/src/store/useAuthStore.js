
import { create } from "zustand";
import axios from "axios";
import { showError, showSuccess } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const AUTH_URL = `${BASE_URL}/auth`;
const ADDRESS_URL = `${BASE_URL}/account/addresses`;

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  loading: false,
  error: null,
  identifier: null,

  authHeader: () => ({
    headers: {
      Authorization: `Bearer ${get().token}`,
    },
  }),

  register: async (payload) => {
    try {
      set({ loading: true, error: null });

      const identifier = payload.phoneNumber || payload.email;
      const isEmail = identifier && identifier.includes("@");
      const res = isEmail
        ? await axios.post(`${AUTH_URL}/email/send-otp`, { email: identifier, fullName: payload.fullName })
        : await axios.post(`${AUTH_URL}/phone/send-otp`, { phoneNumber: identifier, fullName: payload.fullName });

      set({ identifier });

      showSuccess(res);
      return { success: true };
    } catch (err) {
      showError(err);
      const message = err.response?.data?.message || "Register failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  login: async (payload) => {
    try {
      set({ loading: true, error: null });

      const isEmail = payload.identifier.includes("@");
      const res = isEmail
        ? await axios.post(`${AUTH_URL}/email/send-otp`, { email: payload.identifier })
        : await axios.post(`${AUTH_URL}/phone/send-otp`, { phoneNumber: payload.identifier });

      set({ identifier: payload.identifier });

      showSuccess(res);
      return { success: true };
    } catch (err) {
      showError(err);
      const message = err.response?.data?.message || "Login failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  verifyOtp: async (payload) => {
    try {
      set({ loading: true, error: null });

      const identifier = get().identifier || "";
      const isEmail = identifier.includes("@");
      const res = isEmail
        ? await axios.post(`${AUTH_URL}/email/verify-otp`, { email: identifier, otp: payload.otp })
        : await axios.post(`${AUTH_URL}/phone/verify-otp`, { phoneNumber: identifier, otp: payload.otp });

      const token = res.data?.data?.accessToken || res.data?.data?.tokens?.accessToken;

      localStorage.setItem("token", token);

      set({
        token,
        user: res.data?.data?.user,
      });

      showSuccess(res);

      return { success: true };
    } catch (err) {
      showError(err);
      const message = err.response?.data?.message || "OTP verification failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

 getProfile: async () => {
  try {
    set({ loading: true });

    const res = await axios.get(
      `${AUTH_URL}/me`,
      get().authHeader()
    );

    set({ user: res.data?.data });

    return {
      success: true,
      data: res.data?.data,
    };
  } catch (err) {
    if (err.response?.status === 401) {
      get().logout();
    } else {
      set({ user: null });
    }

    return {
      success: false,
      error: err.response?.data?.message,
    };
  } finally {
    set({ loading: false });
  }
},

  updateProfile: async (payload) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.patch(
        `${AUTH_URL}/profile`,
        payload,
        get().authHeader(),
      );

      set({ user: res.data?.data });

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Update failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },
  updateProfilePhoto: async (file) => {
    try {
      set({ loading: true, error: null });

      const formData = new FormData();

      formData.append("profilePhoto", file);

      const res = await axios.patch(`${AUTH_URL}/avatar`, formData, {
        ...get().authHeader(),
        headers: {
          ...get().authHeader().headers,
          "Content-Type": "multipart/form-data",
        },
      });

      set({
        user: res.data?.data,
      });

      showSuccess(res);

      return {
        success: true,
        data: res.data?.data,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Failed to update profile photo";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },
  getAddresses: async () => {
    try {
      set({ loading: true, error: null });

      const res = await axios.get(ADDRESS_URL, get().authHeader());

      set({
        addresses: Array.isArray(res.data?.data) ? res.data.data : [],
      });

      return {
        success: true,
        data: res.data?.data || [],
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Failed to fetch addresses";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  addAddress: async (payload) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.post(ADDRESS_URL, payload, get().authHeader());

      await get().getAddresses();

      showSuccess(res);

      return {
        success: true,
        data: res.data?.data,
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to add address";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  updateAddress: async (id, payload) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.put(
        `${ADDRESS_URL}/${id}`,
        payload,
        get().authHeader(),
      );

      await get().getAddresses();

      showSuccess(res);

      return {
        success: true,
        data: res.data?.data,
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to update address";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  deleteAddress: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.delete(
        `${ADDRESS_URL}/${id}`,
        get().authHeader(),
      );

      await get().getAddresses();

      showSuccess(res);

      return {
        success: true,
      };
    } catch (err) {
      showError(err);

      const message = err.response?.data?.message || "Failed to delete address";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },

  setDefaultAddress: async (id) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.patch(
        `${ADDRESS_URL}/${id}/default`,
        {},
        get().authHeader(),
      );

      await get().getAddresses();

      showSuccess(res);

      return {
        success: true,
      };
    } catch (err) {
      showError(err);

      const message =
        err.response?.data?.message || "Failed to set default address";

      set({ error: message });

      return {
        success: false,
        error: message,
      };
    } finally {
      set({ loading: false });
    }
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, identifier: null });
  },
}));
