import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

export const useAstrologyStore = create(
  // persist(
  (set, get) => {
    return {
      loading: false,
      error: null,

      kundli: null,
      birthChart: null,
      dashaData: null,
      formData: null,

      kpAstrology: null,
      lalKitab: null,
      panchang: null,
      numerology: null,
      matchMaking: null,

      dailyHoroscope: null,

      handleRequest: async (url, params, key) => {
        try {
          set({ loading: true, error: null });

          const res = await axios.get(`${BASE_URL}${url}`, { params });

          console.log(res);

          set({ [key]: res.data?.data || res.data });

          return { success: true, data: res.data };
        } catch (err) {
          const message =
            err?.response?.data?.message || "Something went wrong";

          set({ error: message });

          return { success: false, error: message };
        } finally {
          set({ loading: false });
        }
      },

      getGeoDetails: async (params) => {
        try {
          const res = await axios.get(`${BASE_URL}/astrology/geo-details`, {
            params,
          });

          return { success: true, data: res.data?.data || res.data };
        } catch (err) {
          return {
            success: false,
            error: err?.response?.data?.message,
          };
        }
      },

      generateKundli: async (params) => {
        set({ formData: params });

        console.log("Params", params);

        const updatedParams = {
          latitude: params.latitude,
          longitude: params.longitude,
          dob: params.dob,
          hour: params.hour,
          min: params.min,
          label:
            "astro_details,basic_panchang,planets,manglik,kalsarpa_details,pitra_dosha_report,sadhesati_current_status,vimshottri_antar_vdasha",
        };

        // const isSameRequest = (savedForm) =>
        //   savedForm?.name === params.name &&
        //   savedForm?.dob === params.dob &&
        //   String(savedForm?.latitude) === String(params.latitude) &&
        //   String(savedForm?.longitude) === String(params.longitude) &&
        //   String(savedForm?.hour) === String(params.hour) &&
        //   String(savedForm?.min) === String(params.min);

        // const cachedState = get();
        // if (cachedState?.kundli && isSameRequest(cachedState.formData)) {
        //   // console.log("data from persisted store", cachedState);
        //   return { success: true, data: cachedState.kundli };
        // }

        // const stored = localStorage.getItem("astrology-store");
        // if (stored) {
        //   try {
        //     const data = JSON.parse(stored);
        //     if (data?.kundli && isSameRequest(data.formData)) {
        //       // console.log("data from localstorage", data);
        //       set({ kundli: data.kundli });
        //       return { success: true, data: data.kundli };
        //     }
        //   } catch (err) {
        //     console.warn(
        //       "Failed to parse astrology-store from localStorage",
        //       err,
        //     );
        //   }
        // }

        const result = await get().handleRequest(
          "/astrology/generate-kundli",
          updatedParams,
          "kundli",
        );

        console.log("result", result);

        return result;
      },

      generateBirthChart: async (params) =>
        await get().handleRequest(
          "/astrology/generate-kundli",
          params,
          "birthChart",
        ),

      generateDasha: async (params) =>
        await get().handleRequest(
          "/astrology/generate-kundli",
          params,
          "dashaData",
        ),

      generateMatchMaking: async (params) =>
        await get().handleRequest(
          "/astrology/match-making",
          params,
          "matchMaking",
        ),

      getDailyHoroscope: async (params) =>
        await get().handleRequest(
          "/astrology/daily-horoscope",
          params,
          "dailyHoroscope",
          "post",
        ),
      clearAll: () =>
        set({
          kundli: null,
          birthChart: null,
          dashaData: null,
          formData: null,
          kpAstrology: null,
          lalKitab: null,
          panchang: null,
          numerology: null,
          matchMaking: null,
          dailyHoroscope: null,
          error: null,
        }),

      clearError: () => set({ error: null }),
    };
  },
  {
    name: "astrology-store",
    partialize: (state) => ({
      kundli: state.kundli,
      birthChart: state.birthChart,
      dashaData: state.dashaData,
      formData: state.formData,
    }),
  },
  // ),
);
