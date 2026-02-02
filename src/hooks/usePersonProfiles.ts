import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PersonProfile {
  id: string;
  account_user_id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonProfileData {
  name: string;
  birth_date?: string | null;
  gender?: string | null;
  notes?: string | null;
}

export interface UpdatePersonProfileData extends Partial<CreatePersonProfileData> {
  id: string;
}

const ACTIVE_PROFILE_KEY = "avatar_active_profile_id";

export function usePersonProfiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profiles
  const fetchProfiles = async () => {
    if (!user?.id) {
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("person_profiles")
        .select("*")
        .eq("account_user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setProfiles(data || []);

      // Set active profile from localStorage or default to primary
      const storedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      const validProfile = data?.find((p) => p.id === storedActiveId);
      
      if (validProfile) {
        setActiveProfileId(validProfile.id);
      } else {
        const primaryProfile = data?.find((p) => p.is_primary);
        if (primaryProfile) {
          setActiveProfileId(primaryProfile.id);
          localStorage.setItem(ACTIVE_PROFILE_KEY, primaryProfile.id);
        }
      }
    } catch (error) {
      console.error("Error fetching person profiles:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać profili",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user?.id]);

  // Switch active profile
  const switchActiveProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setActiveProfileId(profileId);
      localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
      toast({
        title: "Przełączono profil",
        description: `Aktywny profil: ${profile.name}`,
      });
    }
  };

  // Create new profile
  const createProfile = async (data: CreatePersonProfileData): Promise<PersonProfile | null> => {
    if (!user?.id) return null;

    try {
      const { data: newProfile, error } = await supabase
        .from("person_profiles")
        .insert({
          account_user_id: user.id,
          name: data.name,
          birth_date: data.birth_date || null,
          gender: data.gender || null,
          notes: data.notes || null,
          is_primary: false,
        })
        .select()
        .single();

      if (error) throw error;

      setProfiles((prev) => [...prev, newProfile]);
      toast({
        title: "Profil dodany",
        description: `Dodano profil: ${newProfile.name}`,
      });

      return newProfile;
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć profilu",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update profile
  const updateProfile = async (data: UpdatePersonProfileData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("person_profiles")
        .update({
          name: data.name,
          birth_date: data.birth_date,
          gender: data.gender,
          notes: data.notes,
        })
        .eq("id", data.id);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) => (p.id === data.id ? { ...p, ...data } : p))
      );

      toast({
        title: "Profil zaktualizowany",
        description: "Zmiany zostały zapisane",
      });

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować profilu",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete profile (non-primary only)
  const deleteProfile = async (profileId: string): Promise<boolean> => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || profile.is_primary) {
      toast({
        title: "Błąd",
        description: "Nie można usunąć profilu głównego",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("person_profiles")
        .delete()
        .eq("id", profileId);

      if (error) throw error;

      setProfiles((prev) => prev.filter((p) => p.id !== profileId));

      // If deleted profile was active, switch to primary
      if (activeProfileId === profileId) {
        const primaryProfile = profiles.find((p) => p.is_primary);
        if (primaryProfile) {
          switchActiveProfile(primaryProfile.id);
        }
      }

      toast({
        title: "Profil usunięty",
        description: `Usunięto profil: ${profile.name}`,
      });

      return true;
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć profilu",
        variant: "destructive",
      });
      return false;
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  return {
    profiles,
    activeProfile,
    activeProfileId,
    isLoading,
    switchActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    refetch: fetchProfiles,
  };
}
