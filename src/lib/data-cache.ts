import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";
import type { QueryClient } from "@tanstack/react-query";

// ─── Categories cache (in localStorage, changes rarely) ──────────────────────
const CATEGORIES_CACHE_KEY = "perfume-note:categories";
const CATEGORIES_TTL_MS = 10 * 60 * 1000;

type CachedValue<T> = {
    value: T;
    cachedAt: number;
};

function readCache<T>(key: string, ttl: number): T | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedValue<T>;
        if (!parsed || typeof parsed.cachedAt !== "number" || parsed.value === undefined) {
            window.localStorage.removeItem(key);
            return null;
        }

        const isExpired = Date.now() - parsed.cachedAt > ttl;
        if (isExpired) {
            window.localStorage.removeItem(key);
            return null;
        }

        return parsed.value;
    } catch {
        window.localStorage.removeItem(key);
        return null;
    }
}

function writeCache<T>(key: string, value: T) {
    if (typeof window === "undefined") return;

    try {
        const payload: CachedValue<T> = {
            value,
            cachedAt: Date.now(),
        };
        window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
        // Ignore storage quota issues.
    }
}

// ─── Products — NO localStorage cache ────────────────────────────────────────
// Products are managed by the admin and must reflect changes immediately.
// We rely solely on React Query's in-memory cache; after any admin action,
// removeQueries() clears it so the next navigation always fetches fresh data.
export async function getCachedProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Product[];
}

export async function getCachedProductById(id: string): Promise<Product> {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Product;
}

// ─── Categories — localStorage cache (changes rarely) ────────────────────────
export async function getCachedCategories(): Promise<Category[]> {
    const cached = readCache<Category[]>(CATEGORIES_CACHE_KEY, CATEGORIES_TTL_MS);
    if (cached) return cached;

    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) throw error;

    const categories = (data ?? []) as Category[];
    writeCache(CATEGORIES_CACHE_KEY, categories);
    return categories;
}

// ─── Preload on app start ─────────────────────────────────────────────────────
export async function preloadSiteData(queryClient: QueryClient) {
    await Promise.all([
        queryClient.ensureQueryData({
            queryKey: ["products"],
            queryFn: getCachedProducts,
        }),
        queryClient.ensureQueryData({
            queryKey: ["categories"],
            queryFn: getCachedCategories,
        }),
    ]);
}

// ─── Cache invalidation & Realtime Notification ─────────────────────────────
// Clears localStorage entries and notifies all open tabs and devices via
// storage event, BroadcastChannel, and Supabase Broadcast channel.
export function invalidateProductCache() {
    if (typeof window === "undefined") return;

    const keys = Object.keys(window.localStorage).filter((key) =>
        key.startsWith("perfume-note:") && key !== "perfume-note:refresh-at"
    );
    keys.forEach((key) => window.localStorage.removeItem(key));

    // Writing a new value triggers the `storage` event in other open tabs,
    // which causes them to call refetchQueries and update their UI immediately.
    window.localStorage.setItem("perfume-note:refresh-at", Date.now().toString());
}

export function notifyProductChange(queryClient?: QueryClient, productId?: string) {
    invalidateProductCache();

    // 1. Same-browser cross-tab sync via BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
            const bc = new BroadcastChannel("perfume-note-sync");
            bc.postMessage("products-updated");
            bc.close();
        } catch {
            // Ignore
        }
    }

    // 2. Cross-device sync via Supabase Realtime Broadcast
    try {
        const channel = supabase.channel("products-realtime-channel");
        channel.send({
            type: "broadcast",
            event: "products-changed",
            payload: { productId },
        });
    } catch {
        // Ignore
    }

    // 3. Current tab React Query refetch
    if (queryClient) {
        if (productId) {
            queryClient.removeQueries({ queryKey: ["product", productId] });
        }
        queryClient.refetchQueries({ queryKey: ["products"] });
    }
}


