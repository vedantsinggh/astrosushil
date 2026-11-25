
import { create } from "zustand";
import axios from "axios";
import { showError, showSuccess } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const AUTH_URL = `${BASE_URL}/auth`;
const ADDRESS_URL = `${BASE_URL}/account/addresses`;

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  loading: false,
  error: null,
  identifier: null,
  pendingFullName: null,

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

      set({ identifier, pendingFullName: payload.fullName || null });

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

      set({ identifier: payload.identifier, pendingFullName: null });

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

      const identifier = get().identifier || payload.identifier || "";
      const fullName = payload.fullName || get().pendingFullName;
      const isEmail = identifier.includes("@");
      const res = isEmail
        ? await axios.post(`${AUTH_URL}/email/verify-otp`, {
            email: identifier,
            otp: payload.otp,
            ...(fullName ? { fullName } : {}),
          })
        : await axios.post(`${AUTH_URL}/phone/verify-otp`, {
            phoneNumber: identifier,
            otp: payload.otp,
            ...(fullName ? { fullName } : {}),
          });

      const token =
        res.data?.tokens?.accessToken ||
        res.data?.accessToken ||
        res.data?.data?.tokens?.accessToken ||
        res.data?.data?.accessToken;
      const refreshToken =
        res.data?.tokens?.refreshToken ||
        res.data?.refreshToken ||
        res.data?.data?.tokens?.refreshToken ||
        res.data?.data?.refreshToken;
      const user = res.data?.user || res.data?.data?.user || null;

      if (token) localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      set({
        token,
        refreshToken: refreshToken || get().refreshToken,
        user,
        pendingFullName: null,
      });

      showSuccess(res);

      return { success: true };
    } catch (err) {
      showError(err);
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "OTP verification failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  refreshAccessToken: async () => {
    try {
      const refreshToken =
        get().refreshToken || localStorage.getItem("refreshToken");
      if (!refreshToken) return false;

      const res = await axios.post(`${AUTH_URL}/refresh`, { refreshToken });
      const token =
        res.data?.tokens?.accessToken ||
        res.data?.accessToken ||
        res.data?.data?.tokens?.accessToken ||
        res.data?.data?.accessToken;
      const nextRefresh =
        res.data?.tokens?.refreshToken ||
        res.data?.refreshToken ||
        res.data?.data?.tokens?.refreshToken ||
        res.data?.data?.refreshToken;

      if (token) localStorage.setItem("token", token);
      if (nextRefresh) localStorage.setItem("refreshToken", nextRefresh);

      set({
        token: token || get().token,
        refreshToken: nextRefresh || get().refreshToken,
      });

      return Boolean(token);
    } catch {
      return false;
    }
  },

  getProfile: async () => {
    try {
      set({ loading: true });

      const res = await axios.get(`${AUTH_URL}/me`, get().authHeader());

      const user = res.data?.user || res.data?.data || res.data;
      set({ user });

      return {
        success: true,
        data: user,
      };
    } catch (err) {
      if (err.response?.status === 401) {
        const refreshed = await get().refreshAccessToken();
        if (refreshed) {
          try {
            const retryRes = await axios.get(
              `${AUTH_URL}/me`,
              get().authHeader(),
            );
            const user =
              retryRes.data?.user || retryRes.data?.data || retryRes.data;
            set({ user });
            return { success: true, data: user };
          } catch {
            // fall through to logout
          }
        }
        await get().logout();
      } else {
        set({ user: null });
      }

      return {
        success: false,
        error: err.response?.data?.error?.message || err.response?.data?.message,
      };
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (payload) => {
    try {
      set({ loading: true, error: null });

      const body =
        payload.fullName !== undefined
          ? { fullName: payload.fullName }
          : payload;

      const res = await axios.patch(
        `${AUTH_URL}/me`,
        body,
        get().authHeader(),
      );

      set({ user: res.data?.user || res.data?.data || res.data });

      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Update failed";
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },
  updateProfilePhoto: async () => {
    const message = "Profile photo upload is currently unavailable.";
    set({ error: message });
    return {
      success: false,
      error: message,
    };
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
  logout: async () => {
    const token = get().token || localStorage.getItem("token");
    const refreshToken =
      get().refreshToken || localStorage.getItem("refreshToken");
    try {
      if (token || refreshToken) {
        await axios.post(
          `${AUTH_URL}/logout`,
          refreshToken ? { refreshToken } : {},
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );
      }
    } catch {
      // ignore logout network errors
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      set({
        user: null,
        token: null,
        refreshToken: null,
        identifier: null,
        pendingFullName: null,
      });
    }
  },
}));
