import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistStore {
  productIds: string[];
  hiddenProductIds: string[];
  addToWishlist: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  setWishlist: (ids: string[]) => void;
  setProductHidden: (id: string, hidden: boolean) => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],
      hiddenProductIds: [],

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

      setProductHidden: (id, hidden) =>
        set((state) => ({
          hiddenProductIds: hidden
            ? state.hiddenProductIds.includes(id)
              ? state.hiddenProductIds
              : [...state.hiddenProductIds, id]
            : state.hiddenProductIds.filter((productId) => productId !== id),
        })),

      count: () => get().productIds.length,
    }),
    {
      name: "perfume-note-wishlist",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
