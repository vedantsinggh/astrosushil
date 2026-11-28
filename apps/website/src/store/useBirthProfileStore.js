import { create } from "zustand";
import axios from "axios";

import { API_BASE_URL as BASE_URL } from "../config/api";
const URL = `${BASE_URL}/birth-profiles`;

const errorOf = (err, fallback) =>
  err?.response?.data?.error?.message || err?.response?.data?.message || fallback;

/**
 * The customer's birth profiles: the same list the mobile app shows. One of them can be the
 * account holder's own ("Self"). Report and booking forms can fill themselves from one.
 */
export const useBirthProfileStore = create((set, get) => ({
  profiles: [],
  loading: false,
  loaded: false,

  fetchProfiles: async () => {
    set({ loading: true });
    try {
      const res = await axios.get(URL, { withCredentials: true });
      const list = res.data?.data ?? res.data?.profiles ?? res.data ?? [];
      const profiles = Array.isArray(list) ? list : [];
      profiles.sort((a, b) => Number(!!b.isSelf) - Number(!!a.isSelf));
      set({ profiles, loaded: true });
      return { success: true, data: profiles };
    } catch (err) {
      return { success: false, error: errorOf(err, "Could not load your birth profiles") };
    } finally {
      set({ loading: false });
    }
  },

  saveProfile: async (profile) => {
    const { id, ...body } = profile;
    try {
      const res = id
        ? await axios.patch(`${URL}/${id}`, body, { withCredentials: true })
        : await axios.post(URL, body, { withCredentials: true });
      await get().fetchProfiles();
      return { success: true, data: res.data?.data ?? res.data };
    } catch (err) {
      return { success: false, error: errorOf(err, "Could not save the birth profile") };
    }
  },

  deleteProfile: async (id) => {
    try {
      await axios.delete(`${URL}/${id}`, { withCredentials: true });
      await get().fetchProfiles();
      return { success: true };
    } catch (err) {
      return { success: false, error: errorOf(err, "Could not delete the birth profile") };
    }
  },
}));

/** "14:30:00" -> "14:30" */
export const hhmm = (time) => String(time || "").slice(0, 5);
