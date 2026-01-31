import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  photoOption: "upload" | "later";
  referralCode?: string;
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
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
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .single();

      // Get user metadata from Supabase Auth
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
        avatarUrl: profile?.avatar_url || undefined,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
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
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    const referralCode = generateReferralCode();
    const redirectUrl = `${window.location.origin}/`;

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

    // Create profile record if user was created
    if (authData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          avatar_url: null,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't fail signup if profile creation fails
      }
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
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
