import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useCartSync } from "@/hooks/use-cart-sync";

import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { preloadSiteData, invalidateProductCache } from "@/lib/data-cache";
import { supabase } from "@/lib/supabase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function SiteLoader() {
  return (
    <div className="app-loader-overlay" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="loader" aria-label="Loading" />
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Loading</p>
          <p className="mt-2 text-sm text-muted-foreground">Preparing your store data…</p>
        </div>
      </div>
    </div>
  );
}

function InitialAppLoader({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await preloadSiteData(queryClient);
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          // Authentication pages must remain usable when optional store data is unavailable.
          if (window.location.pathname.startsWith("/auth/")) {
            setIsReady(true);
          } else {
            setError(err instanceof Error ? err : new Error("Failed to load the initial page data."));
          }
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  if (error) {
    return <ErrorComponent error={error} reset={() => window.location.reload()} />;
  }

  if (!isReady) {
    return <SiteLoader />;
  }

  return <>{children}</>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Perfume note - بيرفيوم نوت" },
      { name: "description", content: "Discover luxury fragrances crafted to reflect who you are. Find your signature scent at Perfume Note." },
      { name: "author", content: "Perfume Note" },
      { property: "og:title", content: "PERFUME NOTE — Luxury Fragrances" },
      { property: "og:description", content: "Discover luxury fragrances crafted to reflect who you are. Find your signature scent at Perfume Note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@PerfumeNote" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&family=Cairo:wght@300;400;500;600;700;900&family=Tajawal:wght@300;400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Listens to Supabase Realtime events on the `products` table.
 * Whenever any product is inserted, updated, or deleted, it actively refetches
 * the products list and notifies every mounted component (shop, home, etc.)
 * to re-render with the latest data — no manual refresh needed.
 */
function useProductsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleRefetch = (productId?: string) => {
      invalidateProductCache();
      if (productId) {
        queryClient.removeQueries({ queryKey: ["product", productId] });
      }
      queryClient.refetchQueries({ queryKey: ["products"] });
    };

    // 1. Cross-tab storage listener (same browser)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "perfume-note:refresh-at") {
        handleRefetch();
      }
    };
    window.addEventListener("storage", handleStorage);

    // 2. Cross-tab BroadcastChannel listener (same browser)
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("perfume-note-sync");
        bc.onmessage = (event) => {
          if (event.data === "products-updated") {
            handleRefetch();
          }
        };
      } catch {
        // Ignore
      }
    }

    // 3. Supabase Realtime channel (postgres_changes + broadcast for cross-device)
    const channel = supabase
      .channel("products-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          const productId =
            (payload.new as { id?: string })?.id ||
            (payload.old as { id?: string })?.id;
          handleRefetch(productId);
        }
      )
      .on(
        "broadcast",
        { event: "products-changed" },
        (payload: Record<string, any>) => {
          const innerPayload = payload["payload"] as { productId?: string } | undefined;
          handleRefetch(innerPayload?.productId);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}


/**
 * Inner component rendered under QueryClientProvider so that
 * useProductsRealtime can safely call useQueryClient().
 */
function AppInner() {
  useCartSync();
  useProductsRealtime();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <I18nProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppInner />
          <InitialAppLoader queryClient={queryClient}>
            <Outlet />
            <Toaster position="top-center" richColors />
          </InitialAppLoader>
        </QueryClientProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
