import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_INTERVIEW_V2,
  FREQUENCY_OPTIONS,
  FrequencyAnswer,
  InterviewV2Content,
  normalizeInterviewContent,
} from "@/types/interviewV2";
import InterviewSplitLayout from "@/components/interview/InterviewSplitLayout";
import { INTERVIEW_STEPS, InterviewQuestionConfig } from "@/components/interview/interviewFlowConfig";
import VoiceRecorder from "@/components/interview/VoiceRecorder";
import avatarLogo from "@/assets/avatar-logo.svg";

/**
 * AdminFillInterview — admin fills out the interview on behalf of a patient.
 * Route: /admin/patient/:id/interview/:profileId
 *   :id         — patient row ID (patients.id)
 *   :profileId  — person_profiles.id for which the interview should be saved
 */
const AdminFillInterview = () => {
  const { id: patientId, profileId } = useParams<{ id: string; profileId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [existingInterviewId, setExistingInterviewId] = useState<string | null>(null);
  const [existingInterviewStatus, setExistingInterviewStatus] = useState<"none" | "draft" | "sent">("none");
  const [formData, setFormData] = useState<InterviewV2Content>(EMPTY_INTERVIEW_V2);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [profileName, setProfileName] = useState<string>("");

  const totalSteps = INTERVIEW_STEPS.length;
  const current = INTERVIEW_STEPS[currentStep];
  const progress = Math.max(5, Math.round(((currentStep + 1) / totalSteps) * 100));

  const backUrl = `/admin/patient/${patientId}?tab=interview`;

  const bootstrap = useCallback(async () => {
    if (!profileId) return;

    try {
      const { data: profileRow } = await supabase
        .from("person_profiles")
        .select("name")
        .eq("id", profileId)
        .maybeSingle();

      if (profileRow?.name) setProfileName(profileRow.name);

      const { data: existing, error: interviewError } = await supabase
        .from("nutrition_interviews")
        .select("id, content, status, last_updated_at")
        .eq("person_profile_id", profileId)
        .order("last_updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (interviewError) throw interviewError;

      if (existing?.id) {
        setExistingInterviewId(existing.id);
        setExistingInterviewStatus(
          existing.status === "sent" || existing.status === "draft" ? existing.status : "none"
        );
        setFormData(normalizeInterviewContent(existing.content));
        if (existing.last_updated_at) setLastSavedAt(new Date(existing.last_updated_at));
      }
    } catch (error) {
      console.error("[AdminFillInterview] bootstrap error", error);
      toast({ variant: "destructive", title: "Błąd", description: "Nie udało się wczytać wywiadu." });
    } finally {
      setIsLoading(false);
    }
  }, [profileId, toast]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const saveInterview = useCallback(
    async (status: "draft" | "sent", silent = true) => {
      if (!profileId || !user?.id) return false;

      if (status === "draft") setIsSaving(true);

      try {
        const targetStatus =
          status === "draft" && existingInterviewStatus === "sent" ? "sent" : status;

        const payload = {
          person_profile_id: profileId,
          content: formData,
          status: targetStatus,
          last_updated_at: new Date().toISOString(),
          last_updated_by: user.id,
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

        setLastSavedAt(new Date());
        setExistingInterviewStatus(targetStatus);

        if (!silent) {
          toast({
            title: targetStatus === "sent" ? "Wywiad zapisany" : "Wersja robocza zapisana",
            description:
              targetStatus === "sent"
                ? "Wywiad pacjenta został zapisany jako wysłany."
                : "Wersja robocza zapisana. Możesz wrócić i kontynuować.",
          });
        }

        return true;
      } catch (error) {
        console.error("[AdminFillInterview] save error", error);
        if (!silent) {
          toast({ variant: "destructive", title: "Błąd zapisu", description: "Nie udało się zapisać wywiadu." });
        }
        return false;
      } finally {
        if (status === "draft") setIsSaving(false);
      }
    },
    [existingInterviewId, existingInterviewStatus, formData, profileId, toast, user?.id]
  );

  const updateStringField = (key: keyof InterviewV2Content, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }) as InterviewV2Content);
  };

  const updateArrayField = (key: keyof InterviewV2Content, optionValue: string, checked: boolean) => {
    setFormData((prev) => {
      const currentValue = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const nextValue = checked
        ? [...new Set([...currentValue, optionValue])]
        : currentValue.filter((v) => v !== optionValue);
      return { ...prev, [key]: nextValue } as InterviewV2Content;
    });
  };

  const updateFrequencyField = (key: keyof InterviewV2Content, nextPartial: Partial<FrequencyAnswer>) => {
    setFormData((prev) => {
      const previous = prev[key] as FrequencyAnswer;
      return {
        ...prev,
        [key]: {
          frequency: nextPartial.frequency ?? previous.frequency,
          note: nextPartial.note ?? previous.note,
        },
      } as InterviewV2Content;
    });
  };

  const getMissingStepFields = (step: (typeof INTERVIEW_STEPS)[number]): string[] =>
    step.questions
      .filter((question) => {
        const value = formData[question.key];
        if (question.type === "checkboxGroup") return !Array.isArray(value) || value.length === 0;
        if (question.type === "frequency") return !(value as FrequencyAnswer)?.frequency;
        return typeof value !== "string" || value.trim().length === 0;
      })
      .map((q) => q.label);

  const handleNext = async () => {
    const missing = getMissingStepFields(current);
    if (missing.length > 0) {
      toast({
        variant: "destructive",
        title: "Uzupełnij wszystkie pola",
        description: `Brakuje: ${missing[0]}${missing.length > 1 ? ` (+${missing.length - 1})` : ""}.`,
      });
      return;
    }
    await saveInterview("draft", true);
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = async () => {
    if (currentStep === 0) {
      navigate(backUrl);
      return;
    }
    await saveInterview("draft", true);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    const missing = getMissingStepFields(current);
    if (missing.length > 0) {
      toast({
        variant: "destructive",
        title: "Uzupełnij wszystkie pola",
        description: `Brakuje: ${missing[0]}${missing.length > 1 ? ` (+${missing.length - 1})` : ""}.`,
      });
      return;
    }

    setIsSubmitting(true);
    const success = await saveInterview("sent", false);
    setIsSubmitting(false);

    if (success) navigate(backUrl);
  };

  const renderQuestion = (question: InterviewQuestionConfig) => {
    const key = question.key;

    if (question.type === "date") {
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <Input
            type="date"
            value={formData[key] as string}
            onChange={(e) => updateStringField(key, e.target.value)}
            className="bg-transparent border-[#cfcfcf]"
          />
        </div>
      );
    }

    if (question.type === "input") {
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <Input
            value={formData[key] as string}
            onChange={(e) => updateStringField(key, e.target.value)}
            placeholder={question.placeholder}
            className="bg-transparent border-[#cfcfcf]"
          />
          {question.helper && <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p>}
        </div>
      );
    }

    if (question.type === "textarea") {
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <Textarea
            value={formData[key] as string}
            onChange={(e) => updateStringField(key, e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[88px] bg-transparent border-[#cfcfcf]"
          />
          {key === "mainSymptoms" && (
            <VoiceRecorder
              onTranscription={(text) => {
                const cur = ((formData.mainSymptoms as string) || "").trim();
                updateStringField("mainSymptoms", cur ? `${cur}\n\n${text}` : text);
              }}
            />
          )}
          {question.helper && <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p>}
        </div>
      );
    }

    if (question.type === "select") {
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <Select value={formData[key] as string} onValueChange={(v) => updateStringField(key, v)}>
            <SelectTrigger className="bg-transparent border-[#cfcfcf]">
              <SelectValue placeholder={question.placeholder ?? "Wybierz"} />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (question.type === "checkboxGroup") {
      const values = Array.isArray(formData[key]) ? (formData[key] as string[]) : [];
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <div className="space-y-2">
            {question.options.map((opt) => {
              const checked = values.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer ${
                    checked ? "border-[#bdbdbd] bg-[#e5e5e5]" : "border-[#d4d4d4] bg-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={(e) => updateArrayField(key, opt.value, e.target.checked)}
                  />
                  <span className="text-sm text-[#1f1f1f]">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {question.helper && <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p>}
        </div>
      );
    }

    // frequency (default)
    const frequencyValue = (formData[key] as FrequencyAnswer) ?? { frequency: "" as const, note: "" };
    return (
      <div key={String(key)} className="space-y-2 border-b border-[#dddddd] pb-4 last:border-0">
        <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
        {question.helper && <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p>}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 items-start">
          <Textarea
            value={frequencyValue.note}
            onChange={(e) => updateFrequencyField(key, { note: e.target.value })}
            placeholder={question.notePlaceholder ?? "Dodaj uwagi"}
            className="min-h-[78px] bg-transparent border-[#cfcfcf]"
          />
          <div className="space-y-1">
            {FREQUENCY_OPTIONS.map((opt) => {
              const checked = frequencyValue.frequency === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer ${
                    checked ? "bg-[#e5e5e5]" : "bg-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`freq-${String(key)}`}
                    checked={checked}
                    onChange={() => updateFrequencyField(key, { frequency: opt.value })}
                  />
                  <span className="text-sm text-[#1f1f1f]">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTwoColumnFrequencyQuestion = (question: InterviewQuestionConfig) => {
    if (question.type !== "frequency") return renderQuestion(question);

    const key = question.key;
    const frequencyValue = (formData[key] as FrequencyAnswer) ?? { frequency: "" as const, note: "" };

    return (
      <div
        key={String(key)}
        className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-x-6 gap-y-2 items-start border-b border-[#dddddd] pb-4 last:border-0"
      >
        <div className="space-y-1">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          {question.helper && <p className="text-sm text-[#8a8a8a]">{question.helper}</p>}
          <Textarea
            value={frequencyValue.note}
            onChange={(e) => updateFrequencyField(key, { note: e.target.value })}
            placeholder={question.notePlaceholder ?? "Dodaj uwagi"}
            className="mt-2 min-h-[60px] bg-transparent border-[#cfcfcf]"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#8a8a8a] uppercase tracking-wide mb-1">Jak często?</p>
          {FREQUENCY_OPTIONS.map((opt) => {
            const checked = frequencyValue.frequency === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer ${
                  checked ? "bg-[#e5e5e5]" : "bg-transparent"
                }`}
              >
                <input
                  type="radio"
                  name={`freq-${String(key)}`}
                  checked={checked}
                  onChange={() => updateFrequencyField(key, { frequency: opt.value })}
                />
                <span className="text-sm text-[#1f1f1f]">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <InterviewSplitLayout>
        <div className="h-full min-h-[60vh] flex items-center justify-center text-[#2a2a2a] gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ładowanie wywiadu...</span>
        </div>
      </InterviewSplitLayout>
    );
  }

  return (
    <InterviewSplitLayout>
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={avatarLogo} alt="Avatar" className="h-8 w-auto" />
        </div>

        <div className="mb-1">
          <p className="text-xs text-[#8a8a8a] uppercase tracking-wide font-medium">
            Wypełniasz wywiad za pacjenta
          </p>
          {profileName && (
            <p className="text-sm font-semibold text-[#191919]">{profileName}</p>
          )}
        </div>

        <h1 className="text-[36px] font-bold text-[#111] leading-none mb-5">Wywiad dietetyczny</h1>

        <div className="h-2 bg-[#d9d9d9] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-black rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium text-[#111]">{current.heading ?? "Wywiad"}</p>
          <p className="text-xs text-[#666] inline-flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            Ostatni zapis:{" "}
            {lastSavedAt
              ? lastSavedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
              : "--:--"}
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto pr-1">
          {current.layout === "two-column"
            ? current.questions.map(renderTwoColumnFrequencyQuestion)
            : current.questions.map(renderQuestion)}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleBack} className="text-[#111]">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {currentStep === 0 ? "Wróć do pacjenta" : "Poprzedni krok"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveInterview("draft", false)}
              disabled={isSaving || isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Zapisz roboczo
            </Button>

            {currentStep === totalSteps - 1 ? (
              <Button type="button" variant="black" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Zapisz wywiad
              </Button>
            ) : (
              <Button type="button" variant="black" onClick={handleNext} disabled={isSaving || isSubmitting}>
                Dalej
              </Button>
            )}
          </div>
        </div>
      </div>
    </InterviewSplitLayout>
  );
};

export default AdminFillInterview;
