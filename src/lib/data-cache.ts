import { supabase } from "@/lib/supabase";
import type { Category, Product } from "@/lib/types";
import type { QueryClient } from "@tanstack/react-query";

const PRODUCTS_CACHE_KEY = "perfume-note:products";
const CATEGORIES_CACHE_KEY = "perfume-note:categories";
const PRODUCT_BY_ID_CACHE_KEY_PREFIX = "perfume-note:product:";
const CACHE_TTL_MS = 10 * 60 * 1000;

type CachedValue<T> = {
    value: T;
    cachedAt: number;
};

function readCache<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedValue<T>;
        if (!parsed || typeof parsed.cachedAt !== "number" || parsed.value === undefined) {
            window.localStorage.removeItem(key);
            return null;
        }

        const isExpired = Date.now() - parsed.cachedAt > CACHE_TTL_MS;
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
        // Ignore storage quota issues while preserving the app UX.
    }
}

export async function getCachedProducts(): Promise<Product[]> {
    const cached = readCache<Product[]>(PRODUCTS_CACHE_KEY);
    if (cached) return cached;

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const products = (data ?? []) as Product[];
    writeCache(PRODUCTS_CACHE_KEY, products);
    return products;
}

export async function getCachedCategories(): Promise<Category[]> {
    const cached = readCache<Category[]>(CATEGORIES_CACHE_KEY);
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

export async function getCachedProductById(id: string): Promise<Product> {
    const cacheKey = `${PRODUCT_BY_ID_CACHE_KEY_PREFIX}${id}`;
    const cached = readCache<Product>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error) throw error;

    const product = data as Product;
    writeCache(cacheKey, product);
    return product;
}

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

export function invalidateProductCache() {
    if (typeof window === "undefined") return;

    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("perfume-note:"));
    keys.forEach((key) => window.localStorage.removeItem(key));
}
