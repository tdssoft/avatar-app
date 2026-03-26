import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanCard from "@/components/dashboard/PlanCard";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Download, ExternalLink, FileText, Loader2, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import { useToast } from "@/hooks/use-toast";
import {
  ACTIVE_PROFILE_CHANGED_EVENT,
  ACTIVE_PROFILE_STORAGE_KEY,
} from "@/hooks/usePersonProfiles";
import {
  downloadRecommendationFile as downloadRecommendationFileByLink,
  getRecommendationFileName,
  getRecommendationFileTypeLabel,
  openRecommendationFileInNewTab,
} from "@/lib/recommendationFile";
import {
  createPatientResultFileSignedUrl,
  fetchPatientResultFilesForActiveProfile,
  uploadPatientResultFileForActiveProfile,
  validatePatientResultFile,
  type PatientResultFileRecord,
} from "@/lib/patientResultFiles";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  diagnosis_summary?: string | null;
  dietary_recommendations?: string | null;
  pdf_url?: string | null;
  download_token?: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    isLoading: flowLoading,
    hasInterview,
    hasInterviewDraft,
    hasPaidPlan,
  } = useUserFlowStatus();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string>("");
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [question, setQuestion] = useState("");
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [patientResultFiles, setPatientResultFiles] = useState<PatientResultFileRecord[]>([]);
  const [isUploadingResultFile, setIsUploadingResultFile] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) {
      setRecommendations([]);
      setIsLoadingRecommendations(false);
      return;
    }

    setIsLoadingRecommendations(true);

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!patient) {
      setIsLoadingRecommendations(false);
      return;
    }

    const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

    let query = supabase
      .from("recommendations")
      .select("id, title, recommendation_date, diagnosis_summary, dietary_recommendations, pdf_url, download_token")
      .eq("patient_id", patient.id)
      .order("recommendation_date", { ascending: false })
      .limit(50);

    if (activeProfileId) {
      query = query.eq("person_profile_id", activeProfileId);
    }

    const { data } = await query;
    const nextRecommendations = (data as Recommendation[]) || [];
    setRecommendations(nextRecommendations);
    setSelectedRecommendationId((prev) => {
      if (nextRecommendations.length === 0) return "";
      if (prev && nextRecommendations.some((rec) => rec.id === prev)) return prev;
      return nextRecommendations[0].id;
    });
    setIsLoadingRecommendations(false);
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [fetchRecommendations, user]);

  useEffect(() => {
    const onProfileChanged = () => {
      fetchRecommendations();
    };

    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);

    return () => {
      window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);
    };
  }, [fetchRecommendations]);

  const fetchPatientResultFiles = useCallback(async () => {
    if (!user?.id) {
      setPatientResultFiles([]);
      return;
    }

    try {
      const files = await fetchPatientResultFilesForActiveProfile(user.id);
      setPatientResultFiles(files);
    } catch (error) {
      console.error("[Dashboard] patient_result_files read error", error);
      setPatientResultFiles([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchPatientResultFiles();
  }, [fetchPatientResultFiles]);

  useEffect(() => {
    const onProfileChanged = () => {
      void fetchPatientResultFiles();
    };
    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);
    return () => window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);
  }, [fetchPatientResultFiles]);

  const openResultFile = async (filePath: string) => {
    try {
      const signedUrl = await createPatientResultFileSignedUrl(filePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast({ variant: "destructive", title: "Błąd", description: "Nie udało się otworzyć pliku." });
    }
  };

  const handlePatientResultFileUpload = async (file: File) => {
    if (!user?.id) return;

    const validationError = validatePatientResultFile(file);
    if (validationError) {
      toast({ variant: "destructive", title: "Błąd", description: validationError });
      return;
    }

    setIsUploadingResultFile(true);
    try {
      await uploadPatientResultFileForActiveProfile(user.id, file);
      await fetchPatientResultFiles();
      toast({ title: "Sukces", description: "Plik został wysłany do specjalisty." });
    } catch (error) {
      console.error("[Dashboard] upload patient result file error", error);
      const description = error instanceof Error ? error.message : "Nie udało się wgrać pliku.";
      toast({ variant: "destructive", title: "Błąd", description });
    } finally {
      setIsUploadingResultFile(false);
    }
  };

  const openRecommendationFile = async (fileReference: string, download = false) => {
    try {
      if (download) {
        await downloadRecommendationFileByLink(fileReference);
        return;
      }

      await openRecommendationFileInNewTab(fileReference);
    } catch {
      toast({ variant: "destructive", title: "Błąd", description: "Nie udało się otworzyć pliku zalecenia." });
    }
  };

  const openSelectedRecommendationDetails = () => {
    if (!selectedRecommendation?.download_token) {
      toast({
        variant: "destructive",
        title: "Brak linku",
        description: "To zalecenie nie ma aktywnego linku szczegółów.",
      });
      return;
    }

    navigate(`/recommendation/download?token=${selectedRecommendation.download_token}`);
  };

  const submitQuestion = useCallback(
    async (message: string): Promise<boolean> => {
      try {
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (!patient) throw new Error("Brak profilu pacjenta");

        const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

        const { error } = await supabase.from("patient_messages").insert({
          patient_id: patient.id,
          message_type: "question",
          message_text: message.trim(),
          person_profile_id: activeProfileId || null,
        });

        if (error) throw error;

        await supabase.functions.invoke("send-question-notification", {
          body: {
            type: "patient_question",
            user_email: user?.email || "",
            user_name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
            message: message.trim(),
          },
        });

        return true;
      } catch (error: unknown) {
        const messageText = error instanceof Error ? error.message : "Nie udało się wysłać pytania";
        toast({ variant: "destructive", title: "Błąd", description: messageText });
        return false;
      }
    },
    [toast, user?.email, user?.firstName, user?.id, user?.lastName],
  );

  const handleSendQuestion = async () => {
    if (!question.trim()) return;

    setIsSendingQuestion(true);
    try {
      const ok = await submitQuestion(question);
      if (!ok) return;

      setQuestion("");
      toast({ title: "Wysłano", description: "Pytanie zostało przesłane." });
    } finally {
      setIsSendingQuestion(false);
    }
  };

  if (flowLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl flex items-center gap-2 text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ładowanie panelu...</span>
        </div>
      </DashboardLayout>
    );
  }

  const selectedRecommendation =
    recommendations.find((rec) => rec.id === selectedRecommendationId) ?? recommendations[0] ?? null;
  const selectedRecommendationDate = selectedRecommendation
    ? new Date(selectedRecommendation.recommendation_date).toLocaleDateString("pl-PL")
    : null;

  return (
    <DashboardLayout>
      <div className="-mx-6 md:-mx-8 lg:-mx-12 -my-6 lg:-my-8 min-h-[calc(100vh-64px)] bg-[#e9edf1] p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1120px] rounded-2xl border border-[#d9dee4] bg-[#f3f5f7] p-5 md:p-8 lg:p-10 space-y-7">
        {!hasPaidPlan && (
          <>
            <div className="mb-8 space-y-2">
              <p className="text-foreground text-sm">Witamy w Avatar!</p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Twoja ścieżka pracy z ciałem zaczyna się w AVATAR</h1>
              <p className="text-muted-foreground text-lg font-semibold">Wybierz odpowiedni program dla siebie:</p>
            </div>
            <div className="space-y-4 max-w-4xl">
              <PlanCard
                title="Indywidualny program wsparcia ciała AVATAR"
                description="Wybierz pakiet dopasowany do Twoich potrzeb zdrowotnych."
                price="220 zł"
                onSelect={() => navigate("/payment?group=avatar")}
              />
              <PlanCard
                title="Regeneracyjny program organizmu"
                description="Program wspierający regenerację organizmu i codzienne nawyki."
                price="27 zł"
                onSelect={() => navigate("/payment?group=regen")}
              />
            </div>

            <div className="mt-6">
              <PhotoUpload
                className="rounded-lg border-[#d9dee4] shadow-none max-w-[280px]"
                title="Twoje zdjęcie"
                actionLabel="Wgraj zdjęcie"
              />
            </div>

            <section className="pt-1">
              <h2 className="text-[24px] leading-tight font-bold mb-3">Zadaj pytanie</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Jeśli masz wątpliwości i chcesz poznać szczegóły naszych usług zadaj nam pytanie, a my odpowiemy mailowo.
              </p>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Wpisz swoje pytanie..."
                className="min-h-[82px] rounded-md bg-white border-[#d9dee4]"
              />
              <Button onClick={handleSendQuestion} disabled={isSendingQuestion || !question.trim()} className="mt-4 h-10 px-7 font-semibold bg-black hover:bg-black/90">
                {isSendingQuestion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Wyślij
              </Button>
            </section>
          </>
        )}

        {hasPaidPlan && (
          <>
            <div className="space-y-3">
              <h1 className="text-[56px] leading-[1.04] font-bold text-foreground">Witamy w Avatar!</h1>
              {recommendations.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={selectedRecommendationId} onValueChange={setSelectedRecommendationId}>
                    <SelectTrigger className="w-fit min-w-[280px] h-8 border-0 bg-transparent p-0 text-[16px] font-semibold shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recommendations.map((rec) => {
                        const recDate = new Date(rec.recommendation_date).toLocaleDateString("pl-PL");
                        return (
                          <SelectItem key={rec.id} value={rec.id}>
                            {`Zalecenia z dnia ${recDate}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 text-sm"
                    onClick={() => navigate("/dashboard/recommendations")}
                  >
                    Wszystkie zalecenia
                  </Button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-[16px] font-semibold text-foreground">
                  <ChevronDown className="h-4 w-4" />
                  <span>Brak opublikowanych zaleceń</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
              <Card className="rounded-lg border-[#d9dee4] shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[26px] leading-[1.05] font-bold">Podsumowanie funkcjonowania organizmu i zalecenia dietetyczne</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingRecommendations ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Ładowanie zaleceń...</span>
                    </div>
                  ) : recommendations.length > 0 && selectedRecommendation ? (
                    <>
                      <p className="text-[16px] leading-7 text-foreground">
                        {selectedRecommendation.diagnosis_summary || "Szczegóły funkcjonowania organizmu i zalecenia dietetyczne zostały przygotowane dla Twojego profilu."}
                      </p>
                      <div>
                        <p className="text-[30px] leading-none font-bold mb-2">Kuracja</p>
                        <p className="text-[16px] leading-7 text-foreground">
                          {selectedRecommendation.dietary_recommendations ||
                            "Zapoznaj się z zaleceniami i realizuj je regularnie. W każdej chwili możesz wrócić do szczegółów i dopytać o kolejne kroki."}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <div className="flex items-center gap-4">
                          {selectedRecommendation.pdf_url && (
                            <div className="rounded-md border border-[#d9dee4] bg-white px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-muted-foreground mb-1">Plik zalecenia</p>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {getRecommendationFileName(selectedRecommendation.pdf_url)}
                                    </p>
                                    <span className="rounded-full border border-[#d9dee4] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                      {getRecommendationFileTypeLabel(selectedRecommendation.pdf_url)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 gap-1.5"
                                    onClick={() => void openRecommendationFile(selectedRecommendation.pdf_url!)}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Otwórz
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 px-3 gap-1.5 bg-black hover:bg-black/90"
                                    onClick={() => void openRecommendationFile(selectedRecommendation.pdf_url!, true)}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Pobierz
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          <Button
                            variant="link"
                            className="text-sm text-foreground p-0 h-auto"
                            onClick={openSelectedRecommendationDetails}
                          >
                            Zobacz szczegóły
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[16px] leading-7 text-muted-foreground">
                        Brak zaleceń dla wybranego profilu.
                      </p>
                      {!hasInterview && (
                        <Button onClick={() => navigate("/interview")} className="h-10 px-5 text-sm font-semibold">
                          {hasInterviewDraft ? "Kontynuuj wywiad" : "Wypełnij wywiad"}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              <PhotoUpload
                className="rounded-lg border-[#d9dee4] shadow-none"
                title="Twoje zdjęcie"
                actionLabel="Zmień zdjęcie"
              />
            </div>

            <Card className="rounded-lg border-[#d9dee4] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-[24px] leading-tight font-bold">Twoje wyniki badań laboratoryjne (z krwi, moczu i inne)</CardTitle>
              </CardHeader>
              <CardContent>
                {patientResultFiles.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {patientResultFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => void openResultFile(file.file_path)}
                        className="rounded-md border border-[#d9dee4] bg-white px-4 py-3 text-left hover:bg-muted/40"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleDateString("pl-PL")}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak wgranych plików wynikowych dla aktywnego profilu.</p>
                )}
                <div className="mt-4">
                  <input
                    id="patient-result-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePatientResultFileUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingResultFile}
                    onClick={() => document.getElementById("patient-result-upload")?.click()}
                    className="gap-2"
                  >
                    {isUploadingResultFile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isUploadingResultFile ? "Wgrywanie..." : "Wgraj wyniki badań"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <section className="pt-1">
              <h2 className="text-[24px] leading-tight font-bold mb-3">Zadaj pytanie</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Jeśli masz wątpliwości i chcesz poznać szczegóły naszych usług zadaj nam pytanie, a my odpowiemy mailowo.
              </p>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur urna arcu, fermentum eget tempus eu, tincidunt sed diam."
                className="min-h-[82px] rounded-md bg-white border-[#d9dee4]"
              />
              <Button onClick={handleSendQuestion} disabled={isSendingQuestion || !question.trim()} className="mt-4 h-10 px-7 font-semibold bg-black hover:bg-black/90">
                {isSendingQuestion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Wyślij
              </Button>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
              <Card className="rounded-lg border-[#d9dee4] shadow-none">
                <CardHeader>
                  <CardTitle className="text-[24px] leading-tight font-bold">Zleć kolejną analizę organizmu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PlanCard
                    title="Jednorazowa analiza organizmu"
                    description="Płacisz raz i otrzymujesz wyniki na podstawie aktualnego stanu organizmu."
                    price="150 zł"
                    onSelect={() => navigate("/payment?group=avatar")}
                  />
                  <PlanCard
                    title="Pakiet miesięczny"
                    description="Płatność miesięczna umożliwia regularne monitorowanie funkcjonowania organizmu."
                    price="90 zł"
                    priceUnit="miesiąc"
                    onSelect={() => navigate("/payment?group=regen")}
                  />
                  <Card className="border border-[#d9dee4] shadow-none">
                    <CardContent className="flex items-center justify-between p-4">
                      <p className="font-semibold text-foreground text-[24px] leading-tight">Wypełnij ponownie wywiad dietetyczny</p>
                      <Button variant="secondary" className="font-semibold text-foreground bg-[#d8dce1] hover:bg-[#cdd2d8]" onClick={() => navigate("/interview")}>
                        Wypełnij
                      </Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
              <PhotoUpload className="rounded-lg border-[#d9dee4] shadow-none" title="Twoje zdjęcie" actionLabel="Zmień zdjęcie" />
            </div>
          </>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
