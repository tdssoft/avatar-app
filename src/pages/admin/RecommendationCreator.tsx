import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Mail, X, Mic } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BodySystemsOverlay from "@/components/admin/BodySystemsOverlay";
import AudioRecorder from "@/components/audio/AudioRecorder";
import AudioRecordingsList from "@/components/audio/AudioRecordingsList";

interface PersonProfile {
  id: string;
  name: string;
  is_primary: boolean;
}

const RecommendationCreator = () => {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [savedRecommendationId, setSavedRecommendationId] = useState<string | null>(null);
  const [audioRefreshTrigger, setAudioRefreshTrigger] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    diagnosisSummary: "",
    dietaryRecommendations: "",
    supplementationProgram: "",
    shopLinks: "",
    supportingTherapies: "",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchPatientProfiles();
  }, [id]);

  const fetchPatientProfiles = async () => {
    // Get patient's user_id first
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id")
      .eq("id", id)
      .single();

    if (patientError || !patient) {
      console.error("Error fetching patient:", patientError);
      return;
    }

    // Get profiles for this user
    const { data: profilesData, error: profilesError } = await supabase
      .from("person_profiles")
      .select("id, name, is_primary")
      .eq("account_user_id", patient.user_id)
      .order("is_primary", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }

    setProfiles(profilesData || []);
    // Auto-select primary profile if exists
    const primaryProfile = profilesData?.find((p) => p.is_primary);
    if (primaryProfile) {
      setSelectedProfileId(primaryProfile.id);
    }
  };

  const handleSystemToggle = (systemId: string) => {
    setSelectedSystems((prev) =>
      prev.includes(systemId)
        ? prev.filter((s) => s !== systemId)
        : [...prev, systemId]
    );
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleSubmit = async () => {
    if (selectedSystems.length === 0) {
      toast.error("Wybierz przynajmniej jeden układ ciała");
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: recommendation, error } = await supabase
        .from("recommendations")
        .insert({
          patient_id: id,
          created_by_admin_id: userData.user?.id,
          body_systems: selectedSystems,
          title: formData.title || null,
          diagnosis_summary: formData.diagnosisSummary || null,
          dietary_recommendations: formData.dietaryRecommendations || null,
          supplementation_program: formData.supplementationProgram || null,
          shop_links: formData.shopLinks || null,
          supporting_therapies: formData.supportingTherapies || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          person_profile_id: selectedProfileId || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Zalecenia zostały zapisane");
      setSavedRecommendationId(recommendation.id);

      // Send email if enabled
      if (sendEmail && recommendation) {
        setIsSendingEmail(true);
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke(
            "send-recommendation-email",
            {
              body: { recommendation_id: recommendation.id },
            }
          );

          if (emailError) {
            console.error("Email error:", emailError);
            toast.error("Zalecenie zapisane, ale nie udało się wysłać emaila");
          } else {
            toast.success("Email z zaleceniem został wysłany");
          }
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
          toast.error("Zalecenie zapisane, ale nie udało się wysłać emaila");
        } finally {
          setIsSendingEmail(false);
        }
      }

    } catch (error) {
      console.error("[RecommendationCreator] Error:", error);
      toast.error("Nie udało się zapisać zaleceń");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    navigate(`/admin/patient/${id}`);
  };

  // If recommendation is saved, show audio recording section
  if (savedRecommendationId && selectedProfileId) {
    return (
      <AdminLayout>
        <div className="h-full flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleFinish}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Zalecenie zapisane</h1>
              <p className="text-muted-foreground">Opcjonalnie możesz nagrać komentarz audio do zalecenia</p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Nagranie audio do zalecenia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Możesz nagrać komentarz audio, który zostanie powiązany z tym zaleceniem.
                  Pacjent będzie mógł go odsłuchać wraz z dokumentem.
                </p>
                <AudioRecorder
                  personProfileId={selectedProfileId}
                  recommendationId={savedRecommendationId}
                  onSaved={() => setAudioRefreshTrigger((prev) => prev + 1)}
                />
                <AudioRecordingsList
                  personProfileId={selectedProfileId}
                  recommendationId={savedRecommendationId}
                  refreshTrigger={audioRefreshTrigger}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button onClick={handleFinish} className="gap-2">
                Zakończ
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/patient/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Kreator zaleceń</h1>
            <p className="text-muted-foreground">Utwórz nowe zalecenia dla pacjenta</p>
          </div>
        </div>

        {/* Layout: on web keep everything inside one viewport by using fixed-height panels */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Interactive Body Systems Overlay */}
          <Card className="min-h-0 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Układy ciała</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">
              <BodySystemsOverlay
                selectedSystems={selectedSystems}
                onToggle={handleSystemToggle}
              />
            </CardContent>
          </Card>

          {/* Right Column - PDF Creator Form */}
          <div className="lg:col-span-2">
            <Card className="min-h-0 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Kreator PDF</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex flex-col gap-4 overflow-auto">
                {/* Title and Profile Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title">Tytuł zalecenia</Label>
                    <Input
                      id="title"
                      placeholder="Np. Zalecenie regeneracyjne - styczeń 2025"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Profil osoby</Label>
                    <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz profil" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                            {profile.is_primary && " (główny)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-2">
                  <Label>Tagi</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Dodaj tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      Dodaj
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Tabs defaultValue="diagnosis" className="flex-1 min-h-0 flex flex-col">
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    <TabsTrigger value="diagnosis">Diagnoza</TabsTrigger>
                    <TabsTrigger value="diet">Dieta</TabsTrigger>
                    <TabsTrigger value="supp">Suplementacja</TabsTrigger>
                    <TabsTrigger value="therapies">Terapie</TabsTrigger>
                    <TabsTrigger value="shop">Sklep</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diagnosis" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="diagnosisSummary">Podsumowanie diagnozy</Label>
                      <Textarea
                        id="diagnosisSummary"
                        placeholder="Wprowadź podsumowanie diagnozy..."
                        value={formData.diagnosisSummary}
                        onChange={(e) =>
                          setFormData({ ...formData, diagnosisSummary: e.target.value })
                        }
                        className="flex-1 min-h-[200px] resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="diet" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="dietaryRecommendations">Zalecenia dietetyczne</Label>
                      <Textarea
                        id="dietaryRecommendations"
                        placeholder="Wprowadź zalecenia dietetyczne..."
                        value={formData.dietaryRecommendations}
                        onChange={(e) =>
                          setFormData({ ...formData, dietaryRecommendations: e.target.value })
                        }
                        className="flex-1 min-h-[200px] resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="supp" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="supplementationProgram">Kuracja - Program suplementacji</Label>
                      <Textarea
                        id="supplementationProgram"
                        placeholder="Wprowadź program suplementacji..."
                        value={formData.supplementationProgram}
                        onChange={(e) =>
                          setFormData({ ...formData, supplementationProgram: e.target.value })
                        }
                        className="flex-1 min-h-[200px] resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="therapies" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="supportingTherapies">Terapie wspierające</Label>
                      <Textarea
                        id="supportingTherapies"
                        placeholder="Wprowadź zalecane terapie wspierające..."
                        value={formData.supportingTherapies}
                        onChange={(e) =>
                          setFormData({ ...formData, supportingTherapies: e.target.value })
                        }
                        className="flex-1 min-h-[200px] resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="shop" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="shopLinks">Linki do sklepu</Label>
                      <Textarea
                        id="shopLinks"
                        placeholder="Wprowadź linki do produktów..."
                        value={formData.shopLinks}
                        onChange={(e) => setFormData({ ...formData, shopLinks: e.target.value })}
                        className="flex-1 min-h-[200px] resize-none"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Email toggle and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 shrink-0 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="send-email"
                      checked={sendEmail}
                      onCheckedChange={setSendEmail}
                    />
                    <Label htmlFor="send-email" className="flex items-center gap-2 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Wyślij email z powiadomieniem
                    </Label>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate(`/admin/patient/${id}`)}>
                      Powrót
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isLoading || isSendingEmail} 
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? "Zapisywanie..." : isSendingEmail ? "Wysyłanie..." : "Zapisz"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RecommendationCreator;
