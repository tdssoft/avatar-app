import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanCard from "@/components/dashboard/PlanCard";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import { useToast } from "@/hooks/use-toast";
import {
  ACTIVE_PROFILE_CHANGED_EVENT,
  ACTIVE_PROFILE_STORAGE_KEY,
} from "@/hooks/usePersonProfiles";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  diagnosis_summary?: string | null;
  dietary_recommendations?: string | null;
}

interface PatientResultFile {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
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
    hasResults,
  } = useUserFlowStatus();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string>("");
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [question, setQuestion] = useState("");
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [patientResultFiles, setPatientResultFiles] = useState<PatientResultFile[]>([]);

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
      .select("id, title, recommendation_date, diagnosis_summary, dietary_recommendations")
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

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!patient) {
      setPatientResultFiles([]);
      return;
    }

    const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    if (!activeProfileId) {
      setPatientResultFiles([]);
      return;
    }

    const { data, error } = await supabase
      .from("patient_result_files")
      .select("id, file_name, file_path, created_at")
      .eq("patient_id", patient.id)
      .eq("person_profile_id", activeProfileId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Dashboard] patient_result_files read error", error);
      setPatientResultFiles([]);
      return;
    }

    setPatientResultFiles((data as PatientResultFile[]) || []);
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

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`dashboard-result-files-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_result_files" }, () => {
        void fetchPatientResultFiles();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPatientResultFiles, user?.id]);

  const openResultFile = async (filePath: string) => {
    const { data, error } = await supabase.storage.from("patient-result-files").createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast({ variant: "destructive", title: "Błąd", description: "Nie udało się otworzyć pliku." });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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
              <h1 className="text-3xl md:text-5xl font-bold text-foreground">Twoja ścieżka pracy z ciałem zaczyna się w AVATAR</h1>
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
          </>
        )}

        {hasPaidPlan && (
          <>
            <div className="space-y-3">
              <h1 className="text-[56px] leading-[1.04] font-bold text-foreground">Witamy w Avatar!</h1>
              {recommendations.length > 0 ? (
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
              ) : (
                <div className="inline-flex items-center gap-2 text-[16px] font-semibold text-foreground">
                  <ChevronDown className="h-4 w-4" />
                  <span>Brak opublikowanych zaleceń</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
              <Card className="rounded-lg border-[#d9dee4] shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[26px] leading-[1.05] font-bold">Podsumowanie diagnozy i zalecenia dietetyczne</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingRecommendations ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Ładowanie zaleceń...</span>
                    </div>
                  ) : hasResults && selectedRecommendation ? (
                    <>
                      <p className="text-[16px] leading-7 text-foreground">
                        {selectedRecommendation.diagnosis_summary || "Szczegóły diagnozy i zalecenia dietetyczne zostały przygotowane dla Twojego profilu."}
                      </p>
                      <div>
                        <p className="text-[30px] leading-none font-bold mb-2">Kuracja</p>
                        <p className="text-[16px] leading-7 text-foreground">
                          {selectedRecommendation.dietary_recommendations ||
                            "Zapoznaj się z zaleceniami i realizuj je regularnie. W każdej chwili możesz wrócić do szczegółów i dopytać o kolejne kroki."}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="link" className="text-sm text-foreground p-0 h-auto" onClick={() => navigate("/dashboard/recommendations")}>
                          Zobacz szczegóły
                        </Button>
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
                title="Twój profil"
                actionLabel="Zobacz szczegóły"
                editable={false}
                onAction={() => navigate("/profile")}
              />
            </div>

            <Card className="rounded-lg border-[#d9dee4] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-[24px] leading-tight font-bold">Pliki wynikowe</CardTitle>
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
                  <CardTitle className="text-[24px] leading-tight font-bold">Zleć kolejną diagnostykę:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PlanCard
                    title="Jednorazowa diagnostyka"
                    description="Płacisz raz i otrzymujesz wyniki na podstawie aktualnego stanu zdrowia."
                    price="150 zł"
                    onSelect={() => navigate("/payment?group=avatar")}
                  />
                  <PlanCard
                    title="Pakiet miesięczny"
                    description="Płatność miesięczna umożliwiająca regularne badanie i monitorowanie stanu zdrowia."
                    price="90 zł"
                    priceUnit="miesiąc"
                    onSelect={() => navigate("/payment?group=regen")}
                  />
                  <Card className="border border-[#d9dee4] shadow-none">
                    <CardContent className="flex items-center justify-between p-4">
                      <p className="font-semibold text-foreground text-[24px] leading-tight">Wypełnij ponownie ankietę</p>
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
