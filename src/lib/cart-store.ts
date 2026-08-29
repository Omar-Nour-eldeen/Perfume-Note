import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/lib/types";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (product: Product, quantity?: number) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  syncProduct: (product: Product) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find((i) => i.product.id === product.id);
        const currentQuantity = existingItem?.quantity || 0;
        const maxQuantity = Math.max(0, product.stock || 0);

        if (quantity <= 0 || currentQuantity + quantity > maxQuantity) {
          return false;
        }

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, { product, quantity }] });
        }
        return true;
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const { items } = get();
        const item = items.find((cartItem) => cartItem.product.id === productId);
        const validQuantity = Math.min(quantity, Math.max(0, item?.product.stock || 0));
        if (validQuantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: items.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: validQuantity }
              : i
          ),
        });
      },

      removeItem: (productId) => {
        const { items } = get();
        set({ items: items.filter((i) => i.product.id !== productId) });
      },

      syncProduct: (product) => {
        const { items } = get();
        // If product is in cart, update its details
        if (items.some((i) => i.product.id === product.id)) {
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, product } : i
            ),
          });
        }
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "perfume-note-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
