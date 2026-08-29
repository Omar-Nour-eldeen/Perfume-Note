import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  const ar = language === "ar";
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/auth/login" });
      } else if (!profile?.is_admin) {
        navigate({ to: "/" });
      }
    }
  }, [user, profile, loading]);

  if (loading || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground">{ar ? "جاري التحقق من الصلاحيات..." : "Checking permissions..."}</span>
      </div>
    );
  }

  return <>{children}</>;
}
