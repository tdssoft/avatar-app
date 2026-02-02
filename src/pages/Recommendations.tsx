import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  body_systems: string[] | null;
  tags: string[] | null;
  diagnosis_summary: string | null;
  person_profile_id: string | null;
  download_token: string | null;
  pdf_url: string | null;
}

interface PersonProfile {
  id: string;
  name: string;
  is_primary: boolean;
}

const Recommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchRecommendations();
    }
  }, [user]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("person_profiles")
      .select("id, name, is_primary")
      .eq("account_user_id", user?.id)
      .order("is_primary", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }

    setProfiles(data || []);
  };

  const fetchRecommendations = async () => {
    setIsLoading(true);
    
    // First get patient record
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (patientError || !patient) {
      console.error("Error fetching patient:", patientError);
      setIsLoading(false);
      return;
    }

    // Then get recommendations
    const { data, error } = await supabase
      .from("recommendations")
      .select(`
        id,
        title,
        recommendation_date,
        body_systems,
        tags,
        diagnosis_summary,
        person_profile_id,
        download_token,
        pdf_url
      `)
      .eq("patient_id", patient.id)
      .order("recommendation_date", { ascending: false });

    if (error) {
      console.error("Error fetching recommendations:", error);
      toast.error("Nie udało się pobrać zaleceń");
    } else {
      setRecommendations(data || []);
    }

    setIsLoading(false);
  };

  const handleDownload = async (recommendation: Recommendation) => {
    if (!recommendation.download_token) {
      toast.error("Brak tokena pobierania");
      return;
    }

    // Open download page in new tab
    window.open(`/recommendation/download?token=${recommendation.download_token}`, "_blank");

    // Log access
    try {
      await supabase.from("recommendation_access_log").insert({
        recommendation_id: recommendation.id,
        person_profile_id: recommendation.person_profile_id,
        access_type: "download",
      });
    } catch (error) {
      console.error("Error logging access:", error);
    }
  };

  const getProfileName = (profileId: string | null): string => {
    if (!profileId) return "Brak przypisania";
    const profile = profiles.find((p) => p.id === profileId);
    return profile?.name || "Nieznany profil";
  };

  const filteredRecommendations = selectedProfileId === "all"
    ? recommendations
    : recommendations.filter((r) => r.person_profile_id === selectedProfileId);

  const bodySystemLabels: Record<string, string> = {
    nerwowy: "Układ nerwowy",
    hormonalny: "Układ hormonalny",
    krazeniowy: "Układ krążenia",
    limfatyczny: "Układ limfatyczny",
    oddechowy: "Układ oddechowy",
    moczowy: "Układ moczowy",
    miesniowy: "Układ mięśniowy",
    odpornosciowy: "Układ odpornościowy",
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Moje zalecenia
            </h1>
            <p className="text-muted-foreground mt-1">
              Przeglądaj i pobieraj swoje indywidualne zalecenia
            </p>
          </div>

          {profiles.length > 1 && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Wybierz profil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie profile</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                      {profile.is_primary && " (główny)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Brak zaleceń
              </h3>
              <p className="text-muted-foreground">
                {selectedProfileId === "all"
                  ? "Nie masz jeszcze żadnych zaleceń."
                  : "Brak zaleceń dla wybranego profilu."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => (
              <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {recommendation.title || `Zalecenie z dnia ${format(
                          new Date(recommendation.recommendation_date),
                          "d MMMM yyyy",
                          { locale: pl }
                        )}`}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(
                            new Date(recommendation.recommendation_date),
                            "d MMMM yyyy",
                            { locale: pl }
                          )}
                        </span>
                        {profiles.length > 1 && recommendation.person_profile_id && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {getProfileName(recommendation.person_profile_id)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(recommendation)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Podgląd</span>
                      </Button>
                      {recommendation.pdf_url && (
                        <Button
                          size="sm"
                          onClick={() => window.open(recommendation.pdf_url!, "_blank")}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {recommendation.diagnosis_summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {recommendation.diagnosis_summary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {recommendation.body_systems?.map((system) => (
                      <Badge key={system} variant="secondary">
                        {bodySystemLabels[system] || system}
                      </Badge>
                    ))}
                    {recommendation.tags?.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recommendations;
