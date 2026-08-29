import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { StoreLayout } from "@/components/StoreLayout";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";
import type { WalletTransaction } from "@/lib/types";

export const Route = createFileRoute("/account/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login" });
    } else if (user) {
      fetchTransactions();
    }
  }, [user, loading]);

  const fetchTransactions = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data as WalletTransaction[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  if (loading || fetching || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground">{ar ? "???? ???????..." : "Loading wallet..."}</span>
      </div>
    );
  }

  return (
    <StoreLayout>
      <main className="mx-auto max-w-4xl px-4 pt-28 pb-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-foreground">
            {ar ? "??????? ???????????" : "My Wallet"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {ar ? "???? ????? ??????? ?????? ????????? ???????" : "Track your refunded balance and financial transaction history"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Balance card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-40">
            <span className="text-xs font-bold text-muted-foreground uppercase">{ar ? "?????? ??????" : "Available Balance"}</span>
            <div>
              <span className="text-3xl font-black text-primary">
                {profile.balance.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-foreground ms-1.5">{ar ? "?.?" : "EGP"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {ar ? "??? ??? ?????? ???????? ??? ???? ????? ?????????." : "Balance is credited upon return request approval."}
            </p>
          </div>

          {/* Transactions list */}
          <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-foreground mb-4">{ar ? "??? ?????????" : "Transaction History"}</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{ar ? "?? ???? ??????? ?????." : "No previous transactions."}</p>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isCredit = Number(tx.amount) > 0;
                  return (
                    <div key={tx.id} className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-bold text-foreground">
                          {tx.description || (isCredit ? (ar ? "???? ?????" : "Refund credit") : (ar ? "????? ????" : "Purchase debit"))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(tx.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US")}
                        </p>
                      </div>
                      <span className={`font-black text-base ${isCredit ? "text-green-600" : "text-red-600"}`}>
                        {isCredit ? "+" : ""}{tx.amount.toFixed(2)} {ar ? "?.?" : "EGP"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </StoreLayout>
  );
}
