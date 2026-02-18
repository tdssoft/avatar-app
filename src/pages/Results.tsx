import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import PlanCard from "@/components/dashboard/PlanCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  diagnosis_summary: string | null;
}

const Results = () => {
  const [question, setQuestion] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingQuestion, setIsSendingQuestion] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    
    // 1. Pobierz patient_id
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (!patient) {
      setIsLoading(false);
      return;
    }

    setPatientId(patient.id);

    // 2. Pobierz aktywny profil z localStorage
    const activeProfileId = localStorage.getItem('activeProfileId');

    // 3. Pobierz zalecenia
    let query = supabase
      .from("recommendations")
      .select("id, title, recommendation_date, diagnosis_summary")
      .eq("patient_id", patient.id)
      .order("recommendation_date", { ascending: false });

    // Filtruj po profilu jeśli jest wybrany
    if (activeProfileId) {
      query = query.eq("person_profile_id", activeProfileId);
    }

    const { data } = await query;
    setRecommendations(data || []);
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
      const activeProfileId = localStorage.getItem('activeProfileId');

      const { error } = await supabase.from("patient_messages").insert({
        patient_id: patientId,
        message_type: "question",
        message_text: question.trim(),
        person_profile_id: activeProfileId || null,
      });

      if (error) throw error;

      // Pobierz dane profilu dla powiadomienia
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Wyślij powiadomienie email do admina
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

  const selectedRecommendation = recommendations.find(
    (rec) => rec.id === selectedRecommendationId
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Nagłówek */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Wyniki badań</h1>
        <p className="text-white/90 text-lg font-medium mb-8">
          Sprawdź zalecenia i historię komunikacji.
        </p>

        {/* Sekcja zalecenia */}
        <div className="flex items-center gap-4 mb-6">
          <Label className="text-sm font-medium text-white whitespace-nowrap">
            Zalecenia z dnia
          </Label>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Ładowanie...</span>
            </div>
          ) : (
            <Select 
              value={selectedRecommendationId} 
              onValueChange={setSelectedRecommendationId}
            >
              <SelectTrigger className="w-[280px] bg-background">
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

        {/* Karta wyników */}
        <Card className="mb-8">
          <CardContent className="p-6">
            {selectedRecommendation ? (
              <div className="space-y-4">
                <h3 className="font-bold text-foreground">
                  {selectedRecommendation.title || "Zalecenie"}
                </h3>
                {selectedRecommendation.diagnosis_summary ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedRecommendation.diagnosis_summary}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Brak opisu diagnozy</p>
                )}
              </div>
            ) : (
              <p className="font-bold text-foreground">
                {recommendations.length === 0 
                  ? "Brak zaleceń dla tego profilu" 
                  : "Wybierz zalecenie z listy powyżej"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sekcja pytanie */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-3">
            Zadaj pytanie lub opisz dolegliwości
          </h2>
          <p className="text-white/80 text-sm mb-4">
            Jeśli masz wątpliwości, lub chcesz poznać szczegóły naszych usług zadaj nam pytanie a my odpowiemy mailowo.
          </p>
          <Textarea
            placeholder="Treść pytania"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[120px] mb-4 bg-background"
            disabled={isSendingQuestion}
          />
          <Button 
            variant="default" 
            className="bg-foreground text-background hover:bg-foreground/90"
            onClick={handleSendQuestion}
            disabled={isSendingQuestion || !question.trim()}
          >
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
        </div>

        {/* Sekcja diagnostyka */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Wybierz odpowiedni program dla siebie:
          </h2>
          <div className="space-y-4">
            <PlanCard
              title="Indywidualny program wsparcia ciała AVATAR"
              description="Kompleksowy program diagnostyczny i terapeutyczny dopasowany do Twojego organizmu."
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
      </div>

      {/* Panel boczny - Twoje zdjęcie */}
      <div className="fixed top-20 right-6 hidden lg:block">
        <PhotoUpload className="w-48" />
      </div>
    </DashboardLayout>
  );
};

export default Results;
