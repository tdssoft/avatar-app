import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import PlanCard from "@/components/dashboard/PlanCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_PROFILE_STORAGE_KEY } from "@/hooks/usePersonProfiles";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  diagnosis_summary: string | null;
}

const Results = () => {
  const [question, setQuestion] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      void fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    setIsLoading(true);

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (!patient) {
      setRecommendations([]);
      setIsLoading(false);
      return;
    }

    setPatientId(patient.id);

    const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

    let query = supabase
      .from("recommendations")
      .select("id, title, recommendation_date, diagnosis_summary")
      .eq("patient_id", patient.id)
      .order("recommendation_date", { ascending: false });

    if (activeProfileId) {
      query = query.eq("person_profile_id", activeProfileId);
    }

    const { data } = await query;
    const recs = data || [];
    setRecommendations(recs);
    if (recs.length > 0) {
      setSelectedRecommendationId((prev) => prev || recs[0].id);
    } else {
      setSelectedRecommendationId("");
    }

    setIsLoading(false);
  };

  const handleSendQuestion = async () => {
    if (!question.trim()) {
      toast.error("Wpisz treść pytania");
      return;
    }

    if (!patientId) {
      toast.error("Nie można wysłać pytania - brak danych pacjenta");
      return;
    }

    setIsSendingQuestion(true);
    try {
      const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

      const { error } = await supabase.from("patient_messages").insert({
        patient_id: patientId,
        message_type: "question",
        message_text: question.trim(),
        person_profile_id: activeProfileId || null,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      await supabase.functions.invoke("send-question-notification", {
        body: {
          type: "patient_question",
          user_email: user?.email || "",
          user_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "",
          message: question.trim(),
        },
      });

      toast.success("Pytanie zostało wysłane. Odpowiemy najszybciej jak to możliwe.");
      setQuestion("");
    } catch (error: any) {
      console.error("[Results] Error sending question:", error);
      toast.error(error.message || "Nie udało się wysłać pytania");
    } finally {
      setIsSendingQuestion(false);
    }
  };

  const selectedRecommendation = recommendations.find((rec) => rec.id === selectedRecommendationId) || null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6">
            <div className="rounded-xl bg-background p-6 space-y-5">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Wyniki badań</h1>
              <p className="text-muted-foreground">Strona wynikowa dla aktywnego profilu.</p>

              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Zalecenia z dnia</Label>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ładowanie...</span>
                  </div>
                ) : (
                  <Select value={selectedRecommendationId} onValueChange={setSelectedRecommendationId}>
                    <SelectTrigger className="w-full md:w-[340px] bg-background">
                      <SelectValue placeholder="Wybierz zalecenie" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {recommendations.length === 0 ? (
                        <SelectItem value="none" disabled>Brak zaleceń</SelectItem>
                      ) : (
                        recommendations.map((rec) => (
                          <SelectItem key={rec.id} value={rec.id}>
                            {format(new Date(rec.recommendation_date), "d MMM yyyy", { locale: pl })}
                            {rec.title ? ` - ${rec.title}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Podsumowanie funkcjonowania organizmu i zalecenia dietetyczne</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ładowanie wyników...</span>
                  </div>
                ) : selectedRecommendation ? (
                  <div className="space-y-4">
                    <p className="font-semibold text-foreground">{selectedRecommendation.title || "Zalecenie"}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedRecommendation.diagnosis_summary || "Brak podsumowania funkcjonowania organizmu dla wybranego wyniku."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="font-semibold text-foreground">Brak wyników dla tego profilu</p>
                    <p className="text-muted-foreground">
                      Gdy wynik będzie gotowy, pojawi się w tej sekcji. Możesz teraz wysłać pytanie lub przejść do wyboru programu.
                    </p>
                    <div className="space-y-3">
                      <PlanCard
                        title="Indywidualny program wsparcia ciała AVATAR"
                        description="Kompleksowy program analizy i wsparcia dopasowany do Twojego organizmu."
                        price="od 220 zł"
                        onSelect={() => navigate("/payment?group=avatar")}
                      />
                      <PlanCard
                        title="Regeneracyjny program organizmu"
                        description="Program wspierający regenerację i profilaktykę, dobierany do Twoich aktualnych potrzeb."
                        price="od 27 zł"
                        onSelect={() => navigate("/payment?group=regen")}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zadaj pytanie przez formularz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Jeśli potrzebujesz doprecyzowania wyników lub kolejnych kroków, napisz wiadomość do zespołu.
                </p>
                <Textarea
                  placeholder="Treść pytania"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isSendingQuestion}
                />
                <Button onClick={handleSendQuestion} disabled={isSendingQuestion || !question.trim()}>
                  {isSendingQuestion ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Wyślij
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle>Zdjęcie profilu</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload className="w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Results;
