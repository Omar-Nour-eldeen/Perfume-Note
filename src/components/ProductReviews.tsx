import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { User, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export function ProductReviews({ productId }: { productId: string }) {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id, rating, comment, created_at, user_id,
          profiles ( name, avatar_url )
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Review[];
    },
  });

  const { data: isEligible, isLoading: isCheckingEligibility } = useQuery({
    queryKey: ["review_eligibility", productId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("order_items")
        .select("id, orders!inner(status, user_id)")
        .eq("product_id", productId)
        .eq("orders.user_id", user.id)
        .eq("orders.status", "delivered")
        .limit(1);
      if (error) {
         console.error("Eligibility error", error);
         return false;
      }
      return data && data.length > 0;
    },
    enabled: !!user
  });

  const existingReview = reviews?.find(r => r.user_id === user?.id);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    }
  }, [existingReview]);

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      if (existingReview) {
        const { error } = await supabase.from("reviews").update({
          rating,
          comment,
        }).eq("id", existingReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          product_id: productId,
          user_id: user.id,
          rating,
          comment,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existingReview ? (ar ? "تم تحديث التقييم بنجاح" : "Review updated successfully") : (ar ? "تمت إضافة التقييم بنجاح" : "Review added successfully"));
      if (!existingReview) {
        setComment("");
        setRating(5);
      }
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (err) => {
      toast.error(ar ? "حدث خطأ" : "Error submitting review", { description: err.message });
    }
  });

  const deleteReview = useMutation({
    mutationFn: async () => {
      if (!user || !existingReview) return;
      const { error } = await supabase.from("reviews").delete().eq("id", existingReview.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(ar ? "تم حذف التقييم بنجاح" : "Review deleted successfully");
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (err) => {
      toast.error(ar ? "حدث خطأ" : "Error deleting review", { description: err.message });
    }
  });

  const averageRating = reviews?.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <section className="mt-24 max-w-3xl mx-auto px-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-6 mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          {ar ? "التقييمات" : "Reviews"}
        </h2>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-primary text-primary" />
            <span className="text-lg font-bold">{averageRating}</span>
            <span className="text-muted-foreground text-sm">({reviews.length})</span>
          </div>
        )}
      </div>

      {user ? (
        isCheckingEligibility ? (
          <div className="bg-secondary/50 p-6 rounded-2xl mb-12 text-center text-muted-foreground">
            {ar ? "جاري التحقق من أهليتك للتقييم..." : "Checking eligibility..."}
          </div>
        ) : isEligible ? (
          <form
            onSubmit={(e) => { e.preventDefault(); submitReview.mutate(); }}
            className="bg-card border border-border/50 p-6 rounded-2xl mb-12"
          >
            <h3 className="text-sm font-bold mb-4">{existingReview ? (ar ? "تعديل تقييمك" : "Edit your review") : (ar ? "أضف تقييمك" : "Write a review")}</h3>
            
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={cn("transition-colors", rating >= star ? "text-primary" : "text-muted")}
                >
                  <Star className={cn("w-6 h-6", rating >= star && "fill-current")} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={ar ? "شاركنا رأيك في هذا العطر..." : "Share your thoughts on this fragrance..."}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm min-h-[100px] mb-4 outline-none focus:border-primary"
              required
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={submitReview.isPending} className="bg-primary text-white flex-1 sm:flex-none">
                {submitReview.isPending ? (ar ? "جاري الإرسال..." : "Submitting...") : existingReview ? (ar ? "تعديل التقييم" : "Update Review") : (ar ? "إرسال التقييم" : "Submit Review")}
              </Button>
              {existingReview && (
                <Button 
                  type="button" 
                  variant="destructive"
                  disabled={deleteReview.isPending} 
                  onClick={() => {
                    if (confirm(ar ? "هل أنت متأكد من حذف هذا التقييم؟" : "Are you sure you want to delete this review?")) {
                      deleteReview.mutate();
                    }
                  }}
                  className="flex-1 sm:flex-none"
                >
                  {deleteReview.isPending ? (ar ? "جاري الحذف..." : "Deleting...") : (ar ? "حذف التقييم" : "Delete Review")}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="bg-secondary/50 p-6 rounded-2xl mb-12 text-center">
            <p className="text-muted-foreground">
              {ar ? "يمكنك تقييم المنتج بعد شرائه واستلامه." : "You can review this product after purchasing and receiving it."}
            </p>
          </div>
        )
      ) : (
        <div className="bg-secondary/50 p-6 rounded-2xl mb-12 text-center">
          <p className="text-muted-foreground mb-4">
            {ar ? "يجب تسجيل الدخول لإضافة تقييم." : "You must be logged in to leave a review."}
          </p>
          <Button variant="outline" asChild>
            <a href="/auth/login">{ar ? "تسجيل الدخول" : "Log In"}</a>
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">{ar ? "جاري تحميل التقييمات..." : "Loading reviews..."}</p>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-border/40 pb-6 last:border-0">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/50">
                  {review.profiles?.avatar_url ? (
                    <img src={review.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">
                      {review.profiles?.name || (ar ? "مستخدم" : "User")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-3.5 h-3.5", i < review.rating ? "fill-primary text-primary" : "text-muted")} />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          {ar ? "لا توجد تقييمات بعد. كن أول من يقيّم!" : "No reviews yet. Be the first to review!"}
        </p>
      )}
    </section>
  );
}
