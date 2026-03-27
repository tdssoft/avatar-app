import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminRole = () => {
  const { session, isLoading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const { data: isAdmin = false, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("[useAdminRole] Error checking admin role:", error);
        return false;
      }
      return !!data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — admin role rarely changes
    enabled: !authLoading && !!userId,
  });

  return { isAdmin, isLoading: authLoading || roleLoading };
};
