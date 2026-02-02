import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Eye, Calendar, User, Filter, X, AlertTriangle, Clock } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  body_systems: string[] | null;
  tags: string[] | null;
  diagnosis_summary: string | null;
  person_profile_id: string | null;
  download_token: string | null;
  token_expires_at: string | null;
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
  
  // Filters
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
        token_expires_at,
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

  // Get all unique tags from recommendations
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    recommendations.forEach((r) => {
      r.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [recommendations]);

  // Apply filters
  const filteredRecommendations = useMemo(() => {
    let result = recommendations;

    // Filter by profile
    if (selectedProfileId !== "all") {
      result = result.filter((r) => r.person_profile_id === selectedProfileId);
    }

    // Filter by date range
    if (dateFrom) {
      result = result.filter((r) => 
        isAfter(parseISO(r.recommendation_date), parseISO(dateFrom)) || 
        r.recommendation_date === dateFrom
      );
    }
    if (dateTo) {
      result = result.filter((r) => 
        isBefore(parseISO(r.recommendation_date), parseISO(dateTo)) || 
        r.recommendation_date === dateTo
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter((r) =>
        selectedTags.some((tag) => r.tags?.includes(tag))
      );
    }

    return result;
  }, [recommendations, selectedProfileId, dateFrom, dateTo, selectedTags]);

  const handleDownload = async (recommendation: Recommendation) => {
    if (!recommendation.download_token) {
      toast.error("Brak tokena pobierania");
      return;
    }

    // Check if token is expired
    if (recommendation.token_expires_at) {
      const expiresAt = new Date(recommendation.token_expires_at);
      if (expiresAt < new Date()) {
        toast.error("Token wygasł. Skontaktuj się z administracją po nowy link.");
        return;
      }
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

  const isTokenExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTokenStatus = (recommendation: Recommendation) => {
    if (!recommendation.download_token) return null;
    if (!recommendation.token_expires_at) return { status: "active", label: "Aktywny" };
    
    const expiresAt = new Date(recommendation.token_expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      return { status: "expired", label: "Wygasł" };
    }
    
    // Check if expires within 24 hours
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilExpiry < 24) {
      return { status: "expiring", label: `Wygasa za ${Math.round(hoursUntilExpiry)}h` };
    }
    
    return { status: "active", label: "Aktywny" };
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedTags([]);
  };

  const hasActiveFilters = dateFrom || dateTo || selectedTags.length > 0;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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

        {/* Filters Section */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="mb-6">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtry
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {(dateFrom || dateTo ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Wyczyść filtry
              </Button>
            )}
          </div>

          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom">Data od</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateTo">Data do</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tagi</Label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

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
                {hasActiveFilters
                  ? "Brak zaleceń spełniających wybrane kryteria."
                  : selectedProfileId === "all"
                  ? "Nie masz jeszcze żadnych zaleceń."
                  : "Brak zaleceń dla wybranego profilu."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => {
              const tokenStatus = getTokenStatus(recommendation);
              
              return (
                <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {recommendation.title || `Zalecenie z dnia ${format(
                              new Date(recommendation.recommendation_date),
                              "d MMMM yyyy",
                              { locale: pl }
                            )}`}
                          </CardTitle>
                          {tokenStatus && (
                            <Badge 
                              variant={
                                tokenStatus.status === "expired" 
                                  ? "destructive" 
                                  : tokenStatus.status === "expiring" 
                                  ? "secondary" 
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {tokenStatus.status === "expired" && (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {tokenStatus.status === "expiring" && (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {tokenStatus.label}
                            </Badge>
                          )}
                        </div>
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
                          disabled={isTokenExpired(recommendation.token_expires_at)}
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
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recommendations;