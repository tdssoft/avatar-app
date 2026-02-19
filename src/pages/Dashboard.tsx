import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanCard from "@/components/dashboard/PlanCard";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import ResultsUpload from "@/components/dashboard/ResultsUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
}

type PrePaymentStep = "symptoms" | "packages";
const PREPAYMENT_STEP_PREFIX = "avatar_prepayment_step";

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
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [question, setQuestion] = useState("");
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [prePaymentStep, setPrePaymentStep] = useState<PrePaymentStep>("symptoms");

  const prePaymentStepKey = user?.id ? `${PREPAYMENT_STEP_PREFIX}_${user.id}` : null;

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
      .select("id, title, recommendation_date")
      .eq("patient_id", patient.id)
      .order("recommendation_date", { ascending: false })
      .limit(5);

    if (activeProfileId) {
      query = query.eq("person_profile_id", activeProfileId);
    }

    const { data } = await query;
    setRecommendations(data || []);
    setIsLoadingRecommendations(false);
  }, [user?.id]);

  useEffect(() => {
    if (!hasPaidPlan || !prePaymentStepKey) return;
    localStorage.removeItem(prePaymentStepKey);
  }, [hasPaidPlan, prePaymentStepKey]);

  useEffect(() => {
    if (!prePaymentStepKey || hasPaidPlan) return;
    const stored = localStorage.getItem(prePaymentStepKey);
    if (stored === "packages") {
      setPrePaymentStep("packages");
    }
  }, [hasPaidPlan, prePaymentStepKey]);

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

  const handlePrePaymentContinue = async () => {
    if (!question.trim()) {
      toast({
        variant: "destructive",
        title: "Uzupełnij opis",
        description: "Najpierw opisz, co Ci dolega.",
      });
      return;
    }

    setIsSendingQuestion(true);
    try {
      const ok = await submitQuestion(question);
      if (!ok) return;

      setQuestion("");
      setPrePaymentStep("packages");
      if (prePaymentStepKey) {
        localStorage.setItem(prePaymentStepKey, "packages");
      }
      toast({
        title: "Dziękujemy",
        description: "Przechodzimy do wyboru programu.",
      });
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

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        {!hasPaidPlan && prePaymentStep === "symptoms" && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Napisz co Ci jest</h1>
              <p className="text-white/90 text-xl">Opisz dolegliwości, aby przejść do wyboru programu.</p>
            </div>
            <Card className="max-w-3xl">
              <CardHeader>
                <CardTitle>Twoje dolegliwości</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Napisz, co Ci dolega i od kiedy..."
                  className="min-h-[180px]"
                />
                <Button onClick={handlePrePaymentContinue} disabled={isSendingQuestion || !question.trim()}>
                  {isSendingQuestion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Dalej
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {!hasPaidPlan && prePaymentStep === "packages" && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                Twoja ścieżka pracy z ciałem zaczyna się w AVATAR
              </h1>
              <p className="text-white/90 text-xl font-semibold">Wybierz odpowiedni program dla siebie:</p>
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
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                Twoja ścieżka pracy z ciałem zaczyna się w AVATAR
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1">
                <PhotoUpload className="h-full" />
              </div>

              <div className="lg:col-span-2 space-y-4">
                {!hasInterview && (
                  <Card>
                    <CardContent className="py-8 space-y-3">
                      <p className="text-foreground font-semibold text-lg">Wypełnij wywiad medyczny</p>
                      <p className="text-muted-foreground">
                        {hasInterviewDraft
                          ? "Masz zapisany roboczy wywiad. Kontynuuj, aby uruchomić diagnostykę."
                          : "Aby rozpocząć diagnostykę, uzupełnij wywiad. Potrzebny czas: około 15 minut."}
                      </p>
                      <Button onClick={() => navigate("/interview")}>
                        {hasInterviewDraft ? "Kontynuuj wywiad" : "Wypełnij wywiad"} {"->"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {hasInterview && !hasResults && (
                  <Card>
                    <CardContent className="py-8">
                      <p className="font-semibold text-foreground">
                        Dziękujemy za wypełnienie wywiadu! Wkrótce wgramy tutaj wyniki. Otrzymasz powiadomienie e-mail.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {hasPaidPlan && hasResults && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Podsumowanie diagnozy i zalecenia dietetyczne</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRecommendations ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ładowanie zaleceń...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <p className="text-muted-foreground">Brak zaleceń zdrowotnych dla tego profilu.</p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => navigate("/dashboard/recommendations")}
                      className="flex items-center gap-3 w-full p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{rec.title || "Zalecenie"}</p>
                        <p className="text-sm text-muted-foreground">{new Date(rec.recommendation_date).toLocaleDateString("pl-PL")}</p>
                      </div>
                    </button>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/recommendations")}>
                    Zobacz szczegóły
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasPaidPlan && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Zadaj pytanie lub opisz dolegliwości</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Jeśli masz wątpliwości, zadaj pytanie, a odpowiemy mailowo.
              </p>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Treść pytania"
                className="min-h-[120px]"
              />
              <Button onClick={handleSendQuestion} disabled={isSendingQuestion || !question.trim()}>
                {isSendingQuestion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Wyślij
              </Button>
            </CardContent>
          </Card>
        )}

        {hasPaidPlan && <ResultsUpload />}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
