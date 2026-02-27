import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastAction } from "@/components/ui/toast";
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
import {
  ACTIVE_PROFILE_CHANGED_EVENT,
  ACTIVE_PROFILE_STORAGE_KEY,
} from "@/hooks/usePersonProfiles";
import InterviewSplitLayout from "@/components/interview/InterviewSplitLayout";
import { INTERVIEW_STEPS, InterviewQuestionConfig } from "@/components/interview/interviewFlowConfig";
import avatarLogo from "@/assets/avatar-logo.svg";
import { useFlowRouteGuard } from "@/hooks/useFlowRouteGuard";

const DRAFT_STORAGE_PREFIX = "avatar_interview_v2_draft";
const STEP_STORAGE_PREFIX = "avatar_interview_v2_step";

const getDraftKey = (profileId: string) => `${DRAFT_STORAGE_PREFIX}_${profileId}`;
const getStepKey = (profileId: string) => `${STEP_STORAGE_PREFIX}_${profileId}`;

const NutritionInterview = () => {
  const { session, isLoading: isAuthLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: isFlowLoading, redirectTo } = useFlowRouteGuard(location.pathname);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileRefreshNonce, setProfileRefreshNonce] = useState(0);
  const [existingInterviewId, setExistingInterviewId] = useState<string | null>(null);
  const [existingInterviewStatus, setExistingInterviewStatus] = useState<"none" | "draft" | "sent">("none");
  const [formData, setFormData] = useState<InterviewV2Content>(EMPTY_INTERVIEW_V2);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const totalSteps = INTERVIEW_STEPS.length;
  const current = INTERVIEW_STEPS[currentStep];
  const progress = Math.max(5, Math.round(((currentStep + 1) / totalSteps) * 100));

  useEffect(() => {
    const onProfileChanged = () => {
      setProfileRefreshNonce((prev) => prev + 1);
    };

    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);

    return () => {
      window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);
    };
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !session) {
      navigate("/login", { replace: true });
    }
  }, [isAuthLoading, navigate, session]);

  useEffect(() => {
    if (!isFlowLoading && redirectTo && redirectTo !== location.pathname) {
      navigate(redirectTo, { replace: true });
    }
  }, [isFlowLoading, location.pathname, navigate, redirectTo]);

  const bootstrap = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const storedActiveProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

      const { data: profiles, error: profilesError } = await supabase
        .from("person_profiles")
        .select("id, is_primary")
        .eq("account_user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (profilesError) throw profilesError;

      const activeProfile =
        (profiles ?? []).find((profile) => profile.id === storedActiveProfileId) ??
        (profiles ?? []).find((profile) => profile.is_primary) ??
        (profiles ?? [])[0];

      if (!activeProfile?.id) {
        toast({
          variant: "destructive",
          title: "Brak profilu",
          description: "Najpierw uzupełnij dane profilu.",
        });
        navigate("/dashboard/profile", { replace: true });
        return;
      }

      setProfileId(activeProfile.id);
      localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeProfile.id);
      setExistingInterviewId(null);
      setExistingInterviewStatus("none");
      setFormData(EMPTY_INTERVIEW_V2);
      setLastSavedAt(null);
      setCurrentStep(0);

      const localDraft = localStorage.getItem(getDraftKey(activeProfile.id));
      if (localDraft) {
        try {
          setFormData(normalizeInterviewContent(JSON.parse(localDraft)));
        } catch (error) {
          console.warn("[NutritionInterview] invalid local draft, ignoring", error);
          localStorage.removeItem(getDraftKey(activeProfile.id));
        }
      }

      const localStep = localStorage.getItem(getStepKey(activeProfile.id));
      if (localStep) {
        const parsedStep = Number(localStep);
        if (Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep < totalSteps) {
          setCurrentStep(parsedStep);
        }
      }

      const { data: existing, error: interviewError } = await supabase
        .from("nutrition_interviews")
        .select("id, content, status, last_updated_at")
        .eq("person_profile_id", activeProfile.id)
        .order("last_updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (interviewError) throw interviewError;

      if (existing?.id) {
        setExistingInterviewId(existing.id);
        if (existing.status === "sent" || existing.status === "draft") {
          setExistingInterviewStatus(existing.status);
        } else {
          setExistingInterviewStatus("none");
        }
        const normalizedContent = normalizeInterviewContent(existing.content);
        setFormData(normalizedContent);
        if (existing.last_updated_at) {
          setLastSavedAt(new Date(existing.last_updated_at));
        }
      }
    } catch (error) {
      console.error("[NutritionInterview] bootstrap error", error);
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie udało się wczytać wywiadu.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, totalSteps, user?.id]);

  useEffect(() => {
    setIsLoading(true);
    bootstrap();
  }, [bootstrap, profileRefreshNonce]);

  const persistLocal = useCallback(
    (next: InterviewV2Content) => {
      if (!profileId) return;
      localStorage.setItem(getDraftKey(profileId), JSON.stringify(next));
    },
    [profileId],
  );

  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(getStepKey(profileId), String(currentStep));
  }, [currentStep, profileId]);

  const saveInterview = useCallback(
    async (status: "draft" | "sent", silent = true) => {
      if (!profileId || !user?.id) return false;

      if (status === "draft") {
        setIsSaving(true);
      }

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

        persistLocal(formData);
        setLastSavedAt(new Date());
        setExistingInterviewStatus(targetStatus);

        if (!silent) {
          if (targetStatus === "sent") {
            toast({ title: "Zapisano", description: "Wywiad został wysłany." });
          } else {
            toast({
              title: "Wersja robocza zapisana",
              description: "Możesz wrócić później i kontynuować wywiad.",
              action: (
                <ToastAction altText="Kontynuuj wywiad" onClick={() => navigate("/interview")}>
                  Kontynuuj wywiad
                </ToastAction>
              ),
            });
          }
        }

        return true;
      } catch (error) {
        console.error("[NutritionInterview] save error", error);
        if (!silent) {
          toast({
            variant: "destructive",
            title: "Błąd zapisu",
            description: "Nie udało się zapisać wywiadu.",
          });
        }
        return false;
      } finally {
        if (status === "draft") {
          setIsSaving(false);
        }
      }
    },
    [existingInterviewId, existingInterviewStatus, formData, navigate, persistLocal, profileId, toast, user?.id],
  );

  useEffect(() => {
    if (!profileId || isLoading) return;

    const id = window.setInterval(() => {
      void saveInterview("draft", true);
    }, 20000);

    return () => window.clearInterval(id);
  }, [isLoading, profileId, saveInterview]);

  const updateStringField = (key: keyof InterviewV2Content, value: string) => {
    const next = {
      ...formData,
      [key]: value,
    } as InterviewV2Content;
    setFormData(next);
    persistLocal(next);
  };

  const updateArrayField = (key: keyof InterviewV2Content, optionValue: string, checked: boolean) => {
    const currentValue = Array.isArray(formData[key]) ? (formData[key] as string[]) : [];
    const nextValue = checked
      ? [...new Set([...currentValue, optionValue])]
      : currentValue.filter((value) => value !== optionValue);

    const next = {
      ...formData,
      [key]: nextValue,
    } as InterviewV2Content;

    setFormData(next);
    persistLocal(next);
  };

  const updateFrequencyField = (key: keyof InterviewV2Content, nextPartial: Partial<FrequencyAnswer>) => {
    const previous = formData[key] as FrequencyAnswer;
    const nextFrequency: FrequencyAnswer = {
      frequency: nextPartial.frequency ?? previous.frequency,
      note: nextPartial.note ?? previous.note,
    };

    const next = {
      ...formData,
      [key]: nextFrequency,
    } as InterviewV2Content;

    setFormData(next);
    persistLocal(next);
  };

  const getMissingStepFields = (step: (typeof INTERVIEW_STEPS)[number]): string[] => {
    return step.questions
      .filter((question) => {
        const value = formData[question.key];

        if (question.type === "checkboxGroup") {
          return !Array.isArray(value) || value.length === 0;
        }

        if (question.type === "frequency") {
          const frequency = value as FrequencyAnswer;
          return !frequency?.frequency || !frequency?.note?.trim();
        }

        return typeof value !== "string" || value.trim().length === 0;
      })
      .map((question) => question.label);
  };

  const handleNext = async () => {
    const missingFields = getMissingStepFields(current);
    if (missingFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Uzupełnij wszystkie pola",
        description: `Brakuje: ${missingFields[0]}${missingFields.length > 1 ? ` (+${missingFields.length - 1})` : ""}.`,
      });
      return;
    }

    await saveInterview("draft", true);
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = async () => {
    if (currentStep === 0) {
      navigate("/dashboard");
      return;
    }

    await saveInterview("draft", true);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    const missingFields = getMissingStepFields(current);
    if (missingFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Uzupełnij wszystkie pola",
        description: `Brakuje: ${missingFields[0]}${missingFields.length > 1 ? ` (+${missingFields.length - 1})` : ""}.`,
      });
      return;
    }

    setIsSubmitting(true);
    const success = await saveInterview("sent", false);
    setIsSubmitting(false);

    if (success && profileId) {
      localStorage.removeItem(getDraftKey(profileId));
      localStorage.removeItem(getStepKey(profileId));
      navigate("/dashboard");
    }
  };

  const handleCancel = async () => {
    await saveInterview("draft", true);
    toast({
      title: "Wersja robocza zapisana",
      description: "Wrócono do dashboardu.",
    });
    navigate("/dashboard");
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
            onChange={(event) => updateStringField(key, event.target.value)}
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
            onChange={(event) => updateStringField(key, event.target.value)}
            placeholder={question.placeholder}
            className="bg-transparent border-[#cfcfcf]"
          />
          {question.helper ? <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p> : null}
        </div>
      );
    }

    if (question.type === "textarea") {
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <Textarea
            value={formData[key] as string}
            onChange={(event) => updateStringField(key, event.target.value)}
            placeholder={question.placeholder}
            className="min-h-[88px] bg-transparent border-[#cfcfcf]"
          />
          {question.helper ? <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p> : null}
        </div>
      );
    }

    if (question.type === "select") {
      return (
        <div key={String(key)} className="space-y-2">
          <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
          <Select value={formData[key] as string} onValueChange={(value) => updateStringField(key, value)}>
            <SelectTrigger className="bg-transparent border-[#cfcfcf]">
              <SelectValue placeholder={question.placeholder ?? "Wybierz"} />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
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
            {question.options.map((option) => {
              const checked = values.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer ${
                    checked ? "border-[#bdbdbd] bg-[#e5e5e5]" : "border-[#d4d4d4] bg-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={(event) => updateArrayField(key, option.value, event.target.checked)}
                  />
                  <span className="text-sm text-[#1f1f1f]">{option.label}</span>
                </label>
              );
            })}
          </div>
          {question.helper ? <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p> : null}
        </div>
      );
    }

    const frequencyValue = formData[key] as FrequencyAnswer;
    return (
      <div key={String(key)} className="space-y-2 border-b border-[#dddddd] pb-4 last:border-0">
        <Label className="text-base font-semibold leading-tight text-[#191919]">{question.label}</Label>
        {question.helper ? <p className="text-xs text-[#8a8a8a] italic">{question.helper}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 items-start">
          <Textarea
            value={frequencyValue.note}
            onChange={(event) => updateFrequencyField(key, { note: event.target.value })}
            placeholder={question.notePlaceholder ?? "Dodaj uwagi"}
            className="min-h-[78px] bg-transparent border-[#cfcfcf]"
          />

          <div className="space-y-1">
            {FREQUENCY_OPTIONS.map((option) => {
              const checked = frequencyValue.frequency === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer ${
                    checked ? "bg-[#e5e5e5]" : "bg-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`frequency-${String(key)}`}
                    checked={checked}
                    onChange={() => updateFrequencyField(key, { frequency: option.value })}
                  />
                  <span className="text-sm text-[#1f1f1f]">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!isFlowLoading && redirectTo && redirectTo !== location.pathname) {
    return null;
  }

  if (isAuthLoading || isFlowLoading || isLoading) {
    return (
      <InterviewSplitLayout>
        <div className="h-full min-h-[60vh] flex items-center justify-center text-[#2a2a2a] gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ładowanie wywiadu...</span>
        </div>
      </InterviewSplitLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <InterviewSplitLayout>
      <div className="h-full flex flex-col">
        <img src={avatarLogo} alt="Avatar" className="h-10 w-auto mb-6" />

        <h1 className="text-[44px] font-bold text-[#111] leading-none mb-5">Wywiad medyczny</h1>

        <div className="h-2 bg-[#d9d9d9] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-black rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium text-[#111]">{current.heading ?? "Wywiad"}</p>
          <p className="text-xs text-[#666] inline-flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            Automatyczny zapis {lastSavedAt ? lastSavedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto pr-1">{current.questions.map(renderQuestion)}</div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleBack} className="text-[#111]">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Powrót
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving || isSubmitting}
            >
              Anuluj
            </Button>
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
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Zapisz
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

export default NutritionInterview;
