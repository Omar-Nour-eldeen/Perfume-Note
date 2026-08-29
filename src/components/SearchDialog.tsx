import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";

interface SearchDialogProps {
  onClose: () => void;
}

export function SearchDialog({ onClose }: SearchDialogProps) {
  const { language } = useI18n();
  const ar = language === "ar";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`title_ar.ilike.%${val}%,title_en.ilike.%${val}%,description_ar.ilike.%${val}%,description_en.ilike.%${val}%`)
        .eq("is_active", true)
        .limit(8);

      if (error) throw error;
      setResults(data as Product[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[10vh]" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
        {/* Search header */}
        <div className="p-4 border-b border-border flex items-center gap-3 bg-secondary/30">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={ar ? "ابحث عن عطر..." : "Search for a fragrance..."}
            className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-foreground text-base h-10 p-0"
          />
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-sm" onClick={onClose}>
            {ar ? "إغلاق" : "Close"}
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="text-center text-sm text-muted-foreground py-6">
              {ar ? "جاري البحث..." : "Searching..."}
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="text-center text-sm text-muted-foreground py-6">
              {ar ? "لم يتم العثور على نتائج." : "No results found."}
            </div>
          )}
          {!loading && results.map((product) => {
            const title = ar ? product.title_ar : product.title_en;
            const price = product.price;
            return (
              <Link
                key={product.id}
                to="/product/$id"
                params={{ id: product.id }}
                onClick={onClose}
                className="flex items-center gap-4 p-2.5 rounded-xl border border-border/40 hover:border-primary/40 bg-card hover:bg-secondary/20 transition"
              >
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={title} className="h-12 w-12 rounded-lg object-cover bg-secondary" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                    GIF
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">{title}</h4>
                  <p className="text-xs text-primary font-black mt-0.5">
                    {price.toFixed(2)} {ar ? "ج.م" : "EGP"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
