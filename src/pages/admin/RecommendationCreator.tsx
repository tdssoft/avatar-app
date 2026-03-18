import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Mail, X, Mic, Upload } from "lucide-react";
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
import { resolveRecommendationProfileId } from "@/lib/recommendationProfile";

interface PersonProfile {
  id: string;
  name: string;
  is_primary: boolean;
}

const MAX_RECOMMENDATION_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_RECOMMENDATION_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
const RECOMMENDATION_UPLOAD_TIMEOUT_MS = 60_000;
const RECOMMENDATION_UPLOAD_TIMEOUT_MS_FOR_WORD_FILES = 180_000;

const getRecommendationUploadTimeoutMs = (file: File): number => {
  const fileName = file.name.toLowerCase();
  const isWordDocument = fileName.endsWith(".doc") || fileName.endsWith(".docx");
  return isWordDocument ? RECOMMENDATION_UPLOAD_TIMEOUT_MS_FOR_WORD_FILES : RECOMMENDATION_UPLOAD_TIMEOUT_MS;
};

const getRecommendationFileName = (value: string | null | undefined) => {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      return decodeURIComponent(new URL(normalized).pathname.split("/").pop() || normalized);
    } catch {
      return normalized;
    }
  }
  return decodeURIComponent(normalized.split("/").pop() || normalized);
};

const RecommendationCreator = () => {
  const { id, recommendationId } = useParams<{ id: string; recommendationId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = !!recommendationId;
  const requestedProfileId = searchParams.get("profileId");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEnsuringProfile, setIsEnsuringProfile] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [savedRecommendationId, setSavedRecommendationId] = useState<string | null>(null);
  const [audioRefreshTrigger, setAudioRefreshTrigger] = useState(0);
  const [selectedRecommendationFile, setSelectedRecommendationFile] = useState<File | null>(null);
  const [existingRecommendationFilePath, setExistingRecommendationFilePath] = useState<string | null>(null);
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

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0 && !isEditMode) {
      setSelectedProfileId(resolveRecommendationProfileId(profiles, requestedProfileId));
    }
  }, [profiles, selectedProfileId, isEditMode, requestedProfileId]);

  useEffect(() => {
    if (isEditMode && recommendationId) {
      fetchExistingRecommendation(recommendationId);
    }
  }, [recommendationId, isEditMode]);

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

    const normalizedProfiles = profilesData || [];
    if (normalizedProfiles.length === 0 && !isEditMode) {
      setIsEnsuringProfile(true);
      try {
        const { data: ensureData, error: ensureError } = await supabase.functions.invoke("admin-ensure-person-profile", {
          body: { patientId: id },
        });
        if (ensureError || ensureData?.error) {
          console.error("[RecommendationCreator] admin-ensure-person-profile error:", ensureError || ensureData?.error);
          toast.error("Nie udało się przygotować profilu osoby dla pacjenta. Spróbuj ponownie.");
        }
      } finally {
        setIsEnsuringProfile(false);
      }

      const { data: profilesAfterEnsure, error: profilesAfterEnsureError } = await supabase
        .from("person_profiles")
        .select("id, name, is_primary")
        .eq("account_user_id", patient.user_id)
        .order("is_primary", { ascending: false });

      if (profilesAfterEnsureError) {
        console.error("Error fetching profiles after ensure:", profilesAfterEnsureError);
        return;
      }

      const ensuredProfiles = profilesAfterEnsure || [];
      if (ensuredProfiles.length > 0) {
        setProfiles(ensuredProfiles);
        if (!isEditMode) setSelectedProfileId(resolveRecommendationProfileId(ensuredProfiles, requestedProfileId));
        return;
      }
      setProfiles([]);
      setSelectedProfileId("");
      toast.error("Nie udało się przygotować profilu osoby dla pacjenta. Spróbuj ponownie.");
      return;
    }

    setProfiles(normalizedProfiles);
    
    // Auto-select first profile for new recommendation (list is sorted with primary first).
    if (!isEditMode) {
      if (normalizedProfiles.length > 0) {
        setSelectedProfileId(resolveRecommendationProfileId(normalizedProfiles, requestedProfileId));
      }
    }
  };

  const fetchExistingRecommendation = async (recId: string) => {
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("id", recId)
        .single();

      if (error) {
        console.error("Error fetching recommendation:", error);
        toast.error("Nie udało się załadować zalecenia");
        return;
      }

      if (data) {
        setFormData({
          title: data.title || "",
          diagnosisSummary: data.diagnosis_summary || "",
          dietaryRecommendations: data.dietary_recommendations || "",
          supplementationProgram: data.supplementation_program || "",
          shopLinks: data.shop_links || "",
          supportingTherapies: data.supporting_therapies || "",
          tags: data.tags || [],
        });
        setSelectedSystems(data.body_systems || []);
        if (data.person_profile_id) {
          setSelectedProfileId(data.person_profile_id);
        }
        setExistingRecommendationFilePath(data.pdf_url || null);
      }
    } catch (err) {
      console.error("Error loading recommendation:", err);
      toast.error("Błąd podczas ładowania danych");
    } finally {
      setIsLoadingData(false);
    }
  };

  const validateRecommendationFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const isAllowedMimeType = ALLOWED_RECOMMENDATION_FILE_TYPES.includes(file.type);
    const hasAllowedExtension = fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx");
    if (!isAllowedMimeType && !hasAllowedExtension) {
      toast.error("Dozwolone formaty plików: PDF, DOC, DOCX");
      return false;
    }
    if (file.size > MAX_RECOMMENDATION_FILE_SIZE) {
      toast.error("Maksymalny rozmiar pliku to 20MB");
      return false;
    }
    return true;
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const uploadRecommendationFile = async (file: File, patientId: string, profileId: string): Promise<string> => {
    const safeName = sanitizeFileName(file.name);
    const filePath = `${patientId}/${profileId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from("recommendation-files")
      .upload(filePath, file, {
        upsert: false,
        cacheControl: "3600",
      });

    if (error) {
      throw error;
    }
    return filePath;
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

  const sendNotificationEmail = async (recId: string, isUpdate: boolean) => {
    setIsSendingEmail(true);
    try {
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        "send-recommendation-email",
        {
          body: { recommendation_id: recId, is_update: isUpdate },
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Zalecenie zapisane, ale nie udało się wysłać emaila");
      } else {
        toast.success(isUpdate ? "Email z powiadomieniem o aktualizacji został wysłany" : "Email z zaleceniem został wysłany");
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      toast.error("Zalecenie zapisane, ale nie udało się wysłać emaila");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedSystems.length === 0) {
      toast.error("Wybierz przynajmniej jeden układ ciała");
      return;
    }

    if (!id) {
      toast.error("Brak identyfikatora pacjenta");
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) {
        throw new Error("Brak aktywnej sesji administratora");
      }

      if (!selectedProfileId) {
        throw new Error("Wybierz profil osoby przed zapisaniem zalecenia.");
      }

      const persistedProfileId = selectedProfileId;

      const recommendationPayload = {
        body_systems: selectedSystems,
        title: formData.title || null,
        diagnosis_summary: formData.diagnosisSummary || null,
        dietary_recommendations: formData.dietaryRecommendations || null,
        supplementation_program: formData.supplementationProgram || null,
        shop_links: formData.shopLinks || null,
        supporting_therapies: formData.supportingTherapies || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        person_profile_id: persistedProfileId,
        pdf_url: existingRecommendationFilePath,
      };

      if (selectedRecommendationFile) {
        const uploadTimeoutMs = getRecommendationUploadTimeoutMs(selectedRecommendationFile);
        const filePath = await withTimeout(
          uploadRecommendationFile(selectedRecommendationFile, id, persistedProfileId),
          uploadTimeoutMs,
          "Przesyłanie pliku trwa zbyt długo. Spróbuj ponownie."
        );
        recommendationPayload.pdf_url = filePath;
      }

      let recommendation;

      if (isEditMode && recommendationId) {
        // UPDATE existing recommendation
        const { data, error } = await supabase
          .from("recommendations")
          .update({
            ...recommendationPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recommendationId)
          .select("id")
          .single();

        if (error) throw error;
        recommendation = data;
        toast.success("Zalecenie zostało zaktualizowane");
      } else {
        // INSERT new recommendation
        const { data, error } = await supabase
          .from("recommendations")
          .insert({
            ...recommendationPayload,
            patient_id: id,
            created_by_admin_id: userData.user.id,
          })
          .select("id")
          .single();

        if (error) throw error;
        recommendation = data;
        toast.success("Zalecenia zostały zapisane");
      }

      setSavedRecommendationId(recommendation.id);
      if (recommendationPayload.pdf_url) {
        setExistingRecommendationFilePath(recommendationPayload.pdf_url);
      }
      setSelectedRecommendationFile(null);

      // Send email if enabled
      if (sendEmail && recommendation) {
        void sendNotificationEmail(recommendation.id, isEditMode);
      }

    } catch (error) {
      console.error("[RecommendationCreator] Error:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Nie udało się zapisać zaleceń";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    navigate(`/admin/patient/${id}`);
  };

  // Show loading state while fetching existing data in edit mode
  if (isLoadingData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  // If recommendation is saved, show audio recording section
  if (savedRecommendationId && selectedProfileId) {
    return (
      <AdminLayout>
        <div className="h-full flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleFinish} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {isEditMode ? "Zalecenie zaktualizowane" : "Zalecenie zapisane"}
              </h1>
              <p className="text-white/80">Opcjonalnie możesz nagrać komentarz audio do zalecenia</p>
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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/patient/${id}`)} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {isEditMode ? "Edycja zalecenia" : "Kreator zaleceń"}
            </h1>
            <p className="text-white/80">
              {isEditMode ? "Edytuj istniejące zalecenie dla pacjenta" : "Utwórz nowe zalecenia dla pacjenta"}
            </p>
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
                    {isEnsuringProfile && (
                      <p className="text-xs text-muted-foreground">Tworzenie profilu głównego...</p>
                    )}
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

                <div className="rounded-md border border-border p-4 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="recommendation-file">Plik zalecenia (PDF/DOC/DOCX)</Label>
                    <p className="text-xs text-muted-foreground">
                      Maksymalnie 20MB. Wgrany plik będzie widoczny na dashboardzie pacjenta.
                    </p>
                  </div>
                  <Input
                    id="recommendation-file"
                    data-testid="recommendation-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) {
                        setSelectedRecommendationFile(null);
                        return;
                      }
                      if (!validateRecommendationFile(file)) {
                        e.currentTarget.value = "";
                        return;
                      }
                      setSelectedRecommendationFile(file);
                    }}
                  />
                  {selectedRecommendationFile ? (
                    <p className="text-sm text-foreground">
                      Wybrany plik: <span className="font-medium">{selectedRecommendationFile.name}</span>
                    </p>
                  ) : existingRecommendationFilePath ? (
                    <p className="text-sm text-muted-foreground">
                      Obecny plik: <span className="font-medium text-foreground">{getRecommendationFileName(existingRecommendationFilePath)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Brak wgranego pliku zalecenia.</p>
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
                      {isEditMode ? "Wyślij email o aktualizacji" : "Wyślij email z powiadomieniem"}
                    </Label>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate(`/admin/patient/${id}`)}>
                      Powrót
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || isSendingEmail || isEnsuringProfile || selectedSystems.length === 0 || !selectedProfileId}
                      className="gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Zapisuję...
                        </>
                      ) : isSendingEmail ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Wysyłam email...
                        </>
                      ) : (
                        <>
                          {selectedRecommendationFile ? <Upload className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                          {isEditMode ? "Zapisz zmiany" : "Zapisz zalecenia"}
                        </>
                      )}
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
