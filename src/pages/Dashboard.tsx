import { useEffect, useState } from "react";
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

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLoading: flowLoading, hasInterview, hasPaidPlan, hasResults } = useUserFlowStatus();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [question, setQuestion] = useState("");
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.onboardingConfirmed) {
      navigate("/onboarding/confirm", { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    setIsLoadingRecommendations(true);

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (!patient) {
      setIsLoadingRecommendations(false);
      return;
    }

    const activeProfileId = localStorage.getItem("activeProfileId");

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
  };

  const handleSendQuestion = async () => {
    if (!question.trim()) return;

    setIsSendingQuestion(true);
    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!patient) throw new Error("Brak profilu pacjenta");

      const activeProfileId = localStorage.getItem("activeProfileId");

      const { error } = await supabase.from("patient_messages").insert({
        patient_id: patient.id,
        message_type: "question",
        message_text: question.trim(),
        person_profile_id: activeProfileId || null,
      });

      if (error) throw error;

      await supabase.functions.invoke("send-question-notification", {
        body: {
          type: "patient_question",
          user_email: user?.email || "",
          user_name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          message: question.trim(),
        },
      });

      setQuestion("");
      toast({ title: "Wysłano", description: "Pytanie zostało przesłane." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się wysłać pytania";
      toast({ variant: "destructive", title: "Błąd", description: message });
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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Witamy w Avatar!</h1>
          <p className="text-white/90 text-lg font-medium">Twoja ścieżka pracy z ciałem zaczyna się w AVATAR.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <PhotoUpload className="h-full" />
          </div>

          <div className="lg:col-span-2 space-y-4">
            {!hasPaidPlan && (
              <>
                <h2 className="text-white text-lg font-semibold">Wybierz odpowiedni plan aby rozpocząć diagnostykę:</h2>
                <PlanCard
                  title="Diagnostyka i kuracja miesięczna"
                  description="Płatność miesięczna umożliwiająca regularne badanie i monitorowanie stanu zdrowia."
                  price="27 zł"
                  priceUnit="miesiąc"
                  onSelect={() => navigate("/payment?group=regen")}
                />
                <PlanCard
                  title="Diagnostyka i kuracja jednorazowa"
                  description="Płacisz raz i otrzymujesz wyniki na podstawie aktualnego stanu zdrowia."
                  price="220 zł"
                  onSelect={() => navigate("/payment?group=avatar")}
                />
              </>
            )}

            {hasPaidPlan && !hasInterview && (
              <Card>
                <CardContent className="py-8 space-y-3">
                  <p className="text-foreground font-semibold text-lg">Dziękujemy za zakup pakietu!</p>
                  <p className="text-muted-foreground">Wypełnij wywiad, aby rozpocząć diagnostykę. Potrzebny czas: do 15 minut.</p>
                  <Button onClick={() => navigate("/interview")}>Dalej {"->"}</Button>
                </CardContent>
              </Card>
            )}

            {hasPaidPlan && hasInterview && !hasResults && (
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

        {hasResults && (
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

        <ResultsUpload />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
