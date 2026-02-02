import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import AudioRecorder from "@/components/audio/AudioRecorder";
import AudioRecordingsList from "@/components/audio/AudioRecordingsList";

interface InterviewData {
  height?: string;
  weight?: string;
  activity_level?: string;
  sleep_hours?: string;
  stress_level?: string;
  diet_type?: string;
  favorite_foods?: string;
  disliked_foods?: string;
  meal_frequency?: string;
  snacking_habits?: string;
  allergies?: string[];
  intolerances?: string[];
  other_allergies?: string;
  digestive_issues?: string;
  energy_issues?: string;
  skin_issues?: string;
  other_health_issues?: string;
  current_supplements?: string;
  past_supplements?: string;
  medications?: string;
  health_goals?: string;
  weight_goals?: string;
  additional_notes?: string;
}

interface AdminInterviewViewProps {
  personProfileId: string;
  patientId: string;
}

const activityLabels: Record<string, string> = {
  sedentary: "Siedzący tryb życia",
  light: "Lekka aktywność",
  moderate: "Umiarkowana aktywność",
  active: "Aktywny",
  very_active: "Bardzo aktywny",
};

const stressLabels: Record<string, string> = {
  low: "Niski",
  moderate: "Umiarkowany",
  high: "Wysoki",
  very_high: "Bardzo wysoki",
};

const dietLabels: Record<string, string> = {
  traditional: "Tradycyjna",
  vegetarian: "Wegetariańska",
  vegan: "Wegańska",
  pescatarian: "Peskatariańska",
  keto: "Ketogeniczna",
  paleo: "Paleo",
  other: "Inna",
};

const weightGoalLabels: Record<string, string> = {
  lose: "Chce schudnąć",
  maintain: "Chce utrzymać wagę",
  gain: "Chce przytyć",
  muscle: "Chce zbudować mięśnie",
  none: "Brak celów wagowych",
};

const AdminInterviewView = ({ personProfileId, patientId }: AdminInterviewViewProps) => {
  const [interview, setInterview] = useState<{
    id: string;
    content: InterviewData;
    last_updated_at: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchInterview();
  }, [personProfileId]);

  const fetchInterview = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("nutrition_interviews")
      .select("id, content, last_updated_at")
      .eq("person_profile_id", personProfileId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching interview:", error);
    } else if (data) {
      setInterview({
        id: data.id,
        content: data.content as unknown as InterviewData,
        last_updated_at: data.last_updated_at,
      });
    } else {
      setInterview(null);
    }

    setIsLoading(false);
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-border last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
    );
  };

  const TextSection = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground">{label}</Label>
        <p className="text-sm bg-muted/50 rounded-lg p-3">{value}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!interview) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Brak wywiadu żywieniowego
          </h3>
          <p className="text-muted-foreground">
            Pacjent nie wypełnił jeszcze wywiadu żywieniowego.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = interview.content;

  return (
    <div className="space-y-6">
      {/* Audio Recordings for Interview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nagrania audio do wywiadu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AudioRecorder
            personProfileId={personProfileId}
            interviewId={interview.id}
            onSaved={() => setRefreshTrigger((prev) => prev + 1)}
          />
          <AudioRecordingsList
            personProfileId={personProfileId}
            interviewId={interview.id}
            refreshTrigger={refreshTrigger}
          />
        </CardContent>
      </Card>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informacje ogólne</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Wzrost" value={data.height ? `${data.height} cm` : undefined} />
          <InfoRow label="Waga" value={data.weight ? `${data.weight} kg` : undefined} />
          <InfoRow label="Poziom aktywności" value={activityLabels[data.activity_level || ""]} />
          <InfoRow label="Godziny snu" value={data.sleep_hours ? `${data.sleep_hours} h` : undefined} />
          <InfoRow label="Poziom stresu" value={stressLabels[data.stress_level || ""]} />
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferencje żywieniowe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Typ diety" value={dietLabels[data.diet_type || ""]} />
          <InfoRow label="Liczba posiłków" value={data.meal_frequency} />
          <TextSection label="Ulubione produkty" value={data.favorite_foods} />
          <TextSection label="Nielubiane produkty" value={data.disliked_foods} />
          <TextSection label="Nawyki przekąskowe" value={data.snacking_habits} />
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alergie i nietolerancje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.allergies && data.allergies.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Alergie</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.allergies.map((allergy) => (
                  <Badge key={allergy} variant="destructive">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {data.intolerances && data.intolerances.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Nietolerancje</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.intolerances.map((intolerance) => (
                  <Badge key={intolerance} variant="secondary">
                    {intolerance}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <TextSection label="Inne alergie/nietolerancje" value={data.other_allergies} />
        </CardContent>
      </Card>

      {/* Health Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dolegliwości zdrowotne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextSection label="Problemy trawienne" value={data.digestive_issues} />
          <TextSection label="Problemy z energią" value={data.energy_issues} />
          <TextSection label="Problemy skórne" value={data.skin_issues} />
          <TextSection label="Inne dolegliwości" value={data.other_health_issues} />
        </CardContent>
      </Card>

      {/* Supplements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suplementacja i leki</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextSection label="Aktualne suplementy" value={data.current_supplements} />
          <TextSection label="Wcześniejsze suplementy" value={data.past_supplements} />
          <TextSection label="Przyjmowane leki" value={data.medications} />
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cele zdrowotne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextSection label="Cele zdrowotne" value={data.health_goals} />
          <InfoRow label="Cele wagowe" value={weightGoalLabels[data.weight_goals || ""]} />
          <TextSection label="Dodatkowe uwagi" value={data.additional_notes} />
        </CardContent>
      </Card>

      {/* Last updated */}
      <p className="text-sm text-muted-foreground text-center">
        Ostatnia aktualizacja:{" "}
        {new Date(interview.last_updated_at).toLocaleDateString("pl-PL", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
};

export default AdminInterviewView;
