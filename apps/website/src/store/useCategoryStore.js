import { create } from "zustand";
import axios from "axios";
import { showError } from "../utils/toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CATEGORY_URL = `${BASE_URL}/categories`;

// Same-named categories can exist as separate documents (e.g. seeded more
// than once, or previously synced from more than one source) — this groups
// them into one card per name, keeping every matching category's own id/
// image/description around so the listing page can still show something
// even if one doc is missing an image, etc.
function groupByName(categories) {
  const byName = new Map();

  for (const cat of categories) {
    const key = cat.name.trim().toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { name: cat.name, ids: [], sources: [], image: null, description: null });
    }
    const group = byName.get(key);
    group.ids.push(cat._id);
    group.sources.push(cat.source);
    if (!group.image && cat.image?.url) group.image = cat.image.url;
    if (!group.description && cat.description) group.description = cat.description;
  }

  return Array.from(byName.values());
}

// Same problem useProductStore's getProducts already solves for products:
// without tracking which call was issued last, a slower response for a
// category the user has since navigated away from can resolve *after* the
// new category's response and silently overwrite state with the wrong
// category's ids/subcategories — visible as "category A's subcategories
// showing under category B" until a hard refresh clears the stale in-flight
// request. Only the most recently *issued* call is allowed to write state.
let latestResolveRequestId = 0;
let latestSubcategoriesRequestId = 0;

const extractCategories = (res) => {
  const raw = res.data?.data;
  return Array.isArray(raw) ? raw : (raw?.categories || raw?.items || []);
};

export const useCategoryStore = create((set) => ({
  topLevelCategories: [], // grouped-by-name, for the landing page cards
  subcategories: [], // grouped-by-name, for chips under a category page
  activeCategoryIds: [], // every doc id matching the current page's category name
  activeCategoryDescription: null, // description shown on that category's product-listing page
  loading: false,
  subLoading: false,
  categoryResolving: false,

  // Resolves a display name (from the URL, exact match needed) to every
  // category doc with that name across both sources — there's no dedicated
  // backend endpoint for this, so it reuses the regex `search` param and
  // filters to an exact case-insensitive match client-side. This id list
  // is what makes subcategory-chip fetching merge-aware. Clears the stale
  // previous category's subcategories so a leaf/has-children decision is
  // never made off old data while this resolves.
  resolveCategoryIdsByName: async (name, productType) => {
    const requestId = ++latestResolveRequestId;
    try {
      set({ categoryResolving: true, subcategories: [], activeCategoryDescription: null });
      const res = await axios.get(CATEGORY_URL, {
        params: { search: name, productType, isActive: true, limit: 50 },
      });
      if (requestId !== latestResolveRequestId) return [];

      const matches = extractCategories(res).filter(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      const ids = matches.map((c) => c._id);
      // Same-name categories can exist as separate docs (groupByName above) —
      // the first one with a non-empty description wins, same rule.
      const description = matches.find((c) => c.description)?.description || null;
      set({ activeCategoryIds: ids, activeCategoryDescription: description });
      return ids;
    } catch (err) {
      if (requestId !== latestResolveRequestId) return [];
      showError(err);
      set({ activeCategoryIds: [], activeCategoryDescription: null });
      return [];
    } finally {
      if (requestId === latestResolveRequestId) set({ categoryResolving: false });
    }
  },

  fetchTopLevelCategories: async (productType) => {
    try {
      set({ loading: true });

      const res = await axios.get(CATEGORY_URL, {
        params: { topLevel: true, productType, isActive: true, limit: 100 },
      });

      set({ topLevelCategories: groupByName(extractCategories(res)) });
    } catch (err) {
      showError(err);
      set({ topLevelCategories: [] });
    } finally {
      set({ loading: false });
    }
  },

  // `parentIds` is every category-doc id a merged category resolved to —
  // fetching children of all of them at once is what makes a merged
  // category (see groupByName above) show subcategories from every one of
  // its underlying docs.
  fetchSubcategories: async (parentIds = [], productType) => {
    const requestId = ++latestSubcategoriesRequestId;

    if (!parentIds.length) {
      if (requestId === latestSubcategoriesRequestId) set({ subcategories: [] });
      return;
    }

    try {
      set({ subLoading: true });

      const res = await axios.get(CATEGORY_URL, {
        params: { parent: parentIds.join(","), productType, isActive: true, limit: 100 },
      });

      if (requestId === latestSubcategoriesRequestId) {
        set({ subcategories: groupByName(extractCategories(res)) });
      }
    } catch (err) {
      if (requestId === latestSubcategoriesRequestId) showError(err);
    } finally {
      if (requestId === latestSubcategoriesRequestId) set({ subLoading: false });
    }
  },
}));
