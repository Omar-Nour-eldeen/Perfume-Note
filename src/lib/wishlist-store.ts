import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistStore {
  productIds: string[];
  addToWishlist: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  setWishlist: (ids: string[]) => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],

      addToWishlist: (id) =>
        set((state) => ({
          productIds: state.productIds.includes(id)
            ? state.productIds
            : [...state.productIds, id],
        })),

      removeFromWishlist: (id) =>
        set((state) => ({
          productIds: state.productIds.filter((pid) => pid !== id),
        })),

      isWishlisted: (id) => get().productIds.includes(id),

      setWishlist: (ids) => set({ productIds: ids }),

      count: () => get().productIds.length,
    }),
    {
      name: "perfume-note-wishlist",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
