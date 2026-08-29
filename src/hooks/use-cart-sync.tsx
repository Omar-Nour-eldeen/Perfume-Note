import { useEffect } from "react";

export function useCartSync() {
  // Local cart does not require Shopify syncing
  useEffect(() => {
    // No-op
  }, []);
}
