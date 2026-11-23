import { create } from "zustand";

/**
 * Factory for zustand domain stores following the consistent pattern:
 * { data, loading, error, fetch, mutate, invalidate }
 * data is cached by a cacheKey (optional) to avoid refetching.
 *
 * fetcher: async (...args) => payload
 * mutator: optional wrapper applied to every mutation fn passed in `mutations`
 */
export function createDomainStore({ fetcher, cacheKeyFn = null, mutations = {} }) {
  return create((set, get) => ({
    data: cacheKeyFn ? {} : null,
    loading: false,
    error: null,

    fetch: async (...args) => {
      const ck = cacheKeyFn ? cacheKeyFn(...args) : null;
      if (ck) {
        const cached = get().data?.[ck];
        if (cached) return cached; // cached by key — skip refetch
      }
      set({ loading: true, error: null });
      try {
        const payload = await fetcher(...args);
        set((s) => ({
          loading: false,
          data: ck ? { ...(s.data || {}), [ck]: payload } : payload,
        }));
        return payload;
      } catch (e) {
        set({ loading: false, error: e?.response?.data?.msg || e.message });
        return null;
      }
    },

    /** force a fresh fetch, ignoring cache */
    refetch: async (...args) => {
      const ck = cacheKeyFn ? cacheKeyFn(...args) : null;
      set({ loading: true, error: null });
      try {
        const payload = await fetcher(...args);
        set((s) => ({
          loading: false,
          data: ck ? { ...(s.data || {}), [ck]: payload } : payload,
        }));
        return payload;
      } catch (e) {
        set({ loading: false, error: e?.response?.data?.msg || e.message });
        return null;
      }
    },

    invalidate: (...args) => {
      const ck = cacheKeyFn ? cacheKeyFn(...args) : null;
      set((s) => ({
        data: ck && s.data ? { ...s.data, [ck]: undefined } : null,
      }));
    },

    ...Object.fromEntries(
      Object.entries(mutations).map(([name, fn]) => [
        name,
        async (...args) => {
          try {
            const result = await fn(...args);
            return result;
          } catch (e) {
            set({ error: e?.response?.data?.msg || e.message });
            throw e;
          }
        },
      ]),
    ),
  }));
}
