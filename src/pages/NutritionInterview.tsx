import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_INTERVIEW_V2, InterviewV2Content } from "@/types/interviewV2";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";

const STORAGE_KEY = "avatar_interview_v2_draft";

type StepConfig = {
  key: keyof InterviewV2Content;
  label: string;
  prompt: string;
  type?: "input" | "textarea" | "date";
};

const STEP_CONFIG: StepConfig[] = [
  { key: "birthDate", label: "Dane podstawowe", prompt: "Data urodzenia", type: "date" },
  { key: "weight", label: "Dane podstawowe", prompt: "Waga (kg)", type: "input" },
  { key: "height", label: "Dane podstawowe", prompt: "Wzrost (cm)", type: "input" },
  { key: "mainSymptoms", label: "Wywiad medyczny", prompt: "Opisz dolegliwości i powód skorzystania z platformy" },
  { key: "symptomDuration", label: "Wywiad medyczny", prompt: "Od jak dawna występują objawy?", type: "input" },
  { key: "symptomFrequency", label: "Wywiad medyczny", prompt: "Jak często występują objawy?", type: "input" },
  { key: "symptomTriggers", label: "Wywiad medyczny", prompt: "Czy są okoliczności nasilające objawy?" },
  { key: "historicalSymptoms", label: "Historia", prompt: "Opisz historyczne dolegliwości" },
  { key: "medicationsSupplementsHerbs", label: "Historia", prompt: "Przyjmowane leki, suplementy i zioła" },
  { key: "dailyFluids", label: "Nawyki", prompt: "Ile płynów wypijasz dziennie i w jakiej formie?" },
  { key: "bowelMovements", label: "Nawyki", prompt: "Czy wypróżnienia są codziennie? O jakiej porze?" },
  { key: "workType", label: "Styl życia", prompt: "Rodzaj wykonywanej pracy", type: "input" },
  { key: "infectionTendency", label: "Styl życia", prompt: "Skłonność do infekcji" },
  { key: "mealsLocation", label: "Żywienie", prompt: "Gdzie najczęściej spożywasz posiłki?", type: "input" },
  { key: "mealsPerDay", label: "Żywienie", prompt: "Ile posiłków jesz w ciągu dnia?", type: "input" },
  { key: "snacking", label: "Żywienie", prompt: "Czy podjadasz między posiłkami?" },
  { key: "intolerancesAllergies", label: "Żywienie", prompt: "Jakich potraw nie tolerujesz (alergie/nietolerancje)?" },
  { key: "addictions", label: "Styl życia", prompt: "Czy masz nałogi?" },
  { key: "fruitsFrequency", label: "Częstotliwość", prompt: "Jak często spożywasz owoce?" },
  { key: "vegetablesFrequency", label: "Częstotliwość", prompt: "Jak często spożywasz warzywa?" },
  { key: "milkFrequency", label: "Częstotliwość", prompt: "Jak często spożywasz mleko?" },
  { key: "notes", label: "Podsumowanie", prompt: "Dodatkowe uwagi" },
];

const NutritionInterview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasPaidPlan, isLoading: isFlowLoading } = useUserFlowStatus();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [existingInterviewId, setExistingInterviewId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InterviewV2Content>(EMPTY_INTERVIEW_V2);

  const current = STEP_CONFIG[currentStep];
  const progress = Math.round(((currentStep + 1) / STEP_CONFIG.length) * 100);

  const canGoNext = useMemo(() => {
    const value = formData[current.key];
    return value.trim().length > 0;
  }, [current.key, formData]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const localDraft = localStorage.getItem(STORAGE_KEY);
        if (localDraft) {
          setFormData({ ...EMPTY_INTERVIEW_V2, ...(JSON.parse(localDraft) as InterviewV2Content) });
        }

        const { data: profiles } = await supabase
          .from("person_profiles")
          .select("id, is_primary")
          .eq("account_user_id", user.id)
          .order("is_primary", { ascending: false })
          .limit(1);

        const primary = profiles?.[0];
        if (!primary?.id) {
          toast({
            variant: "destructive",
            title: "Brak profilu",
            description: "Najpierw uzupełnij dane profilu.",
          });
          navigate("/dashboard/profile");
          return;
        }

        setProfileId(primary.id);

        const { data: existing } = await supabase
          .from("nutrition_interviews")
          .select("id, content, status")
          .eq("person_profile_id", primary.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          setExistingInterviewId(existing.id);
          if (existing.status === "draft" || existing.status === "sent") {
            const content = existing.content as unknown as Partial<InterviewV2Content>;
            setFormData((prev) => ({ ...prev, ...content }));
          }
        }
      } catch (error) {
        console.error("[NutritionInterview] bootstrap error", error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [navigate, toast, user?.id]);

  useEffect(() => {
    if (!isFlowLoading && !hasPaidPlan) {
      navigate("/payment", { replace: true });
    }
  }, [hasPaidPlan, isFlowLoading, navigate]);

  const persistLocal = (next: InterviewV2Content) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveDraft = async () => {
    if (!profileId) return;

    setIsSaving(true);
    try {
      const payload = {
        person_profile_id: profileId,
        content: formData,
        status: "draft" as const,
        last_updated_at: new Date().toISOString(),
        last_updated_by: user?.id,
      };

      if (existingInterviewId) {
        const { error } = await supabase
          .from("nutrition_interviews")
          .update(payload)
          .eq("id", existingInterviewId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("nutrition_interviews")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setExistingInterviewId(data.id);
      }

      toast({ title: "Zapisano roboczo", description: "Wywiad zapisany automatycznie." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się zapisać.";
      toast({ variant: "destructive", title: "Błąd zapisu", description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const submitInterview = async () => {
    if (!profileId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        person_profile_id: profileId,
        content: formData,
        status: "sent" as const,
        last_updated_at: new Date().toISOString(),
        last_updated_by: user?.id,
      };

      if (existingInterviewId) {
        const { error } = await supabase
          .from("nutrition_interviews")
          .update(payload)
          .eq("id", existingInterviewId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("nutrition_interviews")
          .insert(payload);
        if (error) throw error;
      }

      localStorage.removeItem(STORAGE_KEY);
      toast({ title: "Wywiad wysłany", description: "Dziękujemy za wypełnienie wywiadu." });
      navigate("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się wysłać wywiadu.";
      toast({ variant: "destructive", title: "Błąd", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValueChange = (value: string) => {
    const next = {
      ...formData,
      [current.key]: value,
    };
    setFormData(next);
    persistLocal(next);
  };

  const handleNext = async () => {
    if (!canGoNext) return;
    await saveDraft();
    setCurrentStep((prev) => Math.min(prev + 1, STEP_CONFIG.length - 1));
  };

  const handleBack = async () => {
    await saveDraft();
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl flex items-center gap-2 text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ładowanie wywiadu...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Wywiad medyczny</h1>
          <p className="text-white/90">Automatyczny zapis jest włączony.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">{current.label}</CardTitle>
              <p className="text-sm text-muted-foreground">Krok {currentStep + 1}/{STEP_CONFIG.length}</p>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interview-field">{current.prompt}</Label>
              {current.type === "input" || current.type === "date" ? (
                <Input
                  id="interview-field"
                  type={current.type === "date" ? "date" : "text"}
                  value={formData[current.key]}
                  onChange={(e) => handleValueChange(e.target.value)}
                />
              ) : (
                <Textarea
                  id="interview-field"
                  value={formData[current.key]}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="min-h-[140px]"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-4">
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0 || isSaving}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Powrót
                </Button>
                <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Zapisz roboczo
                </Button>
              </div>

              {currentStep === STEP_CONFIG.length - 1 ? (
                <Button onClick={submitInterview} disabled={isSubmitting || !canGoNext}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Wyślij wywiad
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canGoNext || isSaving}>
                  Dalej
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NutritionInterview;
