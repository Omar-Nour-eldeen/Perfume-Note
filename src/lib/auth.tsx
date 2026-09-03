import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  needsProfileCompletion: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange emits INITIAL_SESSION / SIGNED_IN on OAuth return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id, session.user).then((loadedProfile) => {
          // If user just signed in (e.g. Google OAuth) and details are incomplete,
          // immediately redirect them to /auth/complete-profile
          if (
            (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
            loadedProfile &&
            session.user.app_metadata?.provider === "google" &&
            (!loadedProfile.phone || !loadedProfile.governorate || !loadedProfile.address) &&
            !window.location.pathname.startsWith("/auth/complete-profile")
          ) {
            window.location.href = "/auth/complete-profile";
          }
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, currentUser?: User | null): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Profile query error:", error);
      }

      let activeProfile = data as Profile | null;

      if (!activeProfile && (currentUser || user)) {
        const activeUser = currentUser || user;
        if (activeUser) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .upsert({
              id: activeUser.id,
              email: activeUser.email || "",
              name: (activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || "") as string,
              avatar_url: (activeUser.user_metadata?.avatar_url || "") as string,
              balance: 0,
              is_admin: false,
            })
            .select()
            .maybeSingle();

          if (newProfile) {
            activeProfile = newProfile as Profile;
          }
        }
      }

      setProfile(activeProfile);
      return activeProfile;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isAdmin = profile?.is_admin ?? false;

  // True when a user is logged in but hasn't completed their profile (name/phone/governorate/address).
  // Happens for Google OAuth sign-ins that bypass the registration form.
  const needsProfileCompletion =
    !!user &&
    !loading &&
    !!profile &&
    !(profile.phone && profile.governorate && profile.address);

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, needsProfileCompletion, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
