// AuthContext - Supabase Auth integration (v2)
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  avatarUrl?: string;
  onboardingConfirmed?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  photoOption: "upload" | "later";
  photoFile?: File;
  referralCode?: string;
  interviewData?: PreSignupInterviewData;
}

export interface PreSignupInterviewData {
  height: string;
  weight: string;
  activity_level: string;
  sleep_hours: string;
  stress_level: string;
  diet_type: string;
  favorite_foods: string;
  disliked_foods: string;
  meal_frequency: string;
  snacking_habits: string;
  allergies: string[];
  intolerances: string[];
  other_allergies: string;
  digestive_issues: string;
  energy_issues: string;
  skin_issues: string;
  other_health_issues: string;
  current_supplements: string;
  past_supplements: string;
  medications: string;
  health_goals: string;
  weight_goals: string;
  additional_notes: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateReferralCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Guard to prevent duplicate profile fetches
  const fetchingProfileRef = useRef<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("[AuthContext] onAuthStateChange:", event, currentSession?.user?.id);
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid deadlock with Supabase calls inside callback
          setTimeout(() => {
            fetchUserProfile(currentSession.user);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      console.log("[AuthContext] getSession:", existingSession?.user?.id);
      setSession(existingSession);
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    // Prevent duplicate fetches for the same user
    if (fetchingProfileRef.current === supabaseUser.id) {
      console.log("[AuthContext] Already fetching profile for:", supabaseUser.id);
      return;
    }
    fetchingProfileRef.current = supabaseUser.id;
    
    console.log("[AuthContext] fetchUserProfile for:", supabaseUser.id);
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .maybeSingle();

      const metadata = supabaseUser.user_metadata;
      let finalReferralCode = profile?.referral_code || metadata?.referralCode || "";

      // Self-healing: ensure profile exists and has referral_code
      if (!profile) {
        // Create profile if missing
        console.log("[AuthContext] Profile missing, creating...");
        const newReferralCode = metadata?.referralCode || generateReferralCode();
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: supabaseUser.id,
            referral_code: newReferralCode,
            avatar_url: null,
          });
        
        if (insertError) {
          console.error("[AuthContext] Error creating profile:", insertError);
        } else {
          finalReferralCode = newReferralCode;
          console.log("[AuthContext] Profile created with code:", newReferralCode);
        }
        
        // Also update user metadata if needed
        if (!metadata?.referralCode) {
          await supabase.auth.updateUser({ data: { referralCode: newReferralCode } });
        }
      } else if (!profile.referral_code && metadata?.referralCode) {
        // Profile exists but referral_code is null - update it
        console.log("[AuthContext] Syncing referral_code to profile...");
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ referral_code: metadata.referralCode })
          .eq("user_id", supabaseUser.id);
        
        if (!updateError) {
          finalReferralCode = metadata.referralCode;
          console.log("[AuthContext] Profile updated with code:", metadata.referralCode);
        }
      } else if (!profile.referral_code && !metadata?.referralCode) {
        // Both are missing - generate new code
        console.log("[AuthContext] Both codes missing, generating new...");
        const newReferralCode = generateReferralCode();
        
        await Promise.all([
          supabase.from("profiles").update({ referral_code: newReferralCode }).eq("user_id", supabaseUser.id),
          supabase.auth.updateUser({ data: { referralCode: newReferralCode } }),
        ]);
        
        finalReferralCode = newReferralCode;
        console.log("[AuthContext] Generated new code:", newReferralCode);
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        firstName: metadata?.firstName || profile?.first_name || "",
        lastName: metadata?.lastName || profile?.last_name || "",
        phone: metadata?.phone || profile?.phone || "",
        referralCode: finalReferralCode,
        referredBy: metadata?.referredBy,
        createdAt: supabaseUser.created_at,
        avatarUrl: profile?.avatar_url || undefined,
        onboardingConfirmed:
          metadata?.onboardingConfirmed === true ||
          Boolean((profile?.first_name || "").trim() && (profile?.last_name || "").trim()),
      });
    } catch (error) {
      console.error("[AuthContext] Error fetching profile:", error);
      // Still set user even if profile fetch fails
      const metadata = supabaseUser.user_metadata;
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        firstName: metadata?.firstName || "",
        lastName: metadata?.lastName || "",
        phone: metadata?.phone || "",
        referralCode: metadata?.referralCode || "",
        referredBy: metadata?.referredBy,
        createdAt: supabaseUser.created_at,
        onboardingConfirmed: metadata?.onboardingConfirmed === true,
      });
    } finally {
      fetchingProfileRef.current = null;
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      return { success: false, error: error.message };
    }

    // Wait for user profile to be loaded before returning success
    if (data.user) {
      await fetchUserProfile(data.user);
    }

    return { success: true };
  };

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    const referralCode = generateReferralCode();
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          referralCode: referralCode,
          referredBy: data.referralCode || null,
          photoOption: data.photoOption,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Call backend function to create profile and referral (bypasses RLS)
    if (authData.user) {
      console.log("[AuthContext] Calling post-signup edge function...");
      
      const { data: fnData, error: fnError } = await supabase.functions.invoke("post-signup", {
        body: {
          userId: authData.user.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          referralCode: referralCode,
          referredBy: data.referralCode || null,
          interviewData: data.interviewData,
        },
      });

      if (fnError) {
        console.error("[AuthContext] post-signup error:", fnError);
        // Don't fail signup - user account was created, just log the error
      } else {
        console.log("[AuthContext] post-signup success:", fnData);
      }

      // Best-effort avatar upload selected during signup
      if (data.photoFile && data.photoOption === "upload") {
        try {
          const fileExt = data.photoFile.name.split(".").pop() || "jpg";
          const filePath = `${authData.user.id}/avatar.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, data.photoFile, { upsert: true });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

          const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                user_id: authData.user.id,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

          if (profileError) {
            console.error("[AuthContext] avatar profile upsert error:", profileError);
          }
        } catch (avatarError) {
          console.error("[AuthContext] avatar upload during signup failed:", avatarError);
        }
      }
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      await fetchUserProfile(supabaseUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        // Use session for authentication check (fixes double-click issue)
        isAuthenticated: !!session,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
