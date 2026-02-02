import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Edit, Save, X, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
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

interface HistoryEntry {
  id: string;
  content: InterviewData;
  changed_at: string;
  changed_by: string | null;
}

interface AdminInterviewViewProps {
  personProfileId: string;
  patientId: string;
}

const defaultInterviewData: InterviewData = {
  height: "",
  weight: "",
  activity_level: "",
  sleep_hours: "",
  stress_level: "",
  diet_type: "",
  favorite_foods: "",
  disliked_foods: "",
  meal_frequency: "",
  snacking_habits: "",
  allergies: [],
  intolerances: [],
  other_allergies: "",
  digestive_issues: "",
  energy_issues: "",
  skin_issues: "",
  other_health_issues: "",
  current_supplements: "",
  past_supplements: "",
  medications: "",
  health_goals: "",
  weight_goals: "",
  additional_notes: "",
};

const allergyOptions = [
  "Gluten",
  "Laktoza",
  "Orzechy",
  "Jaja",
  "Soja",
  "Ryby",
  "Owoce morza",
  "Sezam",
];

const intoleranceOptions = [
  "Laktoza",
  "Fruktoza",
  "Histamina",
  "FODMAP",
  "Kofeina",
];

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<InterviewData>(defaultInterviewData);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
      const content = data.content as unknown as InterviewData;
      setInterview({
        id: data.id,
        content: content,
        last_updated_at: data.last_updated_at,
      });
      setFormData({ ...defaultInterviewData, ...content });
    } else {
      setInterview(null);
      setFormData(defaultInterviewData);
    }

    setIsLoading(false);
  };

  const fetchHistory = async () => {
    if (!interview) return;
    
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("nutrition_interview_history")
      .select("id, content, changed_at, changed_by")
      .eq("interview_id", interview.id)
      .order("changed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching history:", error);
      toast.error("Nie udało się pobrać historii");
    } else {
      setHistory((data || []).map(h => ({
        ...h,
        content: h.content as unknown as InterviewData
      })));
    }
    setIsLoadingHistory(false);
  };

  const handleEdit = () => {
    if (interview) {
      setFormData({ ...defaultInterviewData, ...interview.content });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (interview) {
      setFormData({ ...defaultInterviewData, ...interview.content });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!interview) return;

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Save current version to history before updating
      const historyContent = JSON.parse(JSON.stringify(interview.content));
      await supabase
        .from("nutrition_interview_history")
        .insert([{
          interview_id: interview.id,
          content: historyContent,
          changed_by: userData.user?.id,
        }]);

      // Update interview
      const contentJson = JSON.parse(JSON.stringify(formData));
      const { error } = await supabase
        .from("nutrition_interviews")
        .update({
          content: contentJson,
          last_updated_at: new Date().toISOString(),
          last_updated_by: userData.user?.id,
        })
        .eq("id", interview.id);

      if (error) throw error;

      toast.success("Wywiad został zaktualizowany");
      setIsEditing(false);
      fetchInterview();
    } catch (error) {
      console.error("Error saving interview:", error);
      toast.error("Nie udało się zapisać wywiadu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckboxChange = (
    field: "allergies" | "intolerances",
    value: string,
    checked: boolean
  ) => {
    const current = formData[field] || [];
    if (checked) {
      setFormData({ ...formData, [field]: [...current, value] });
    } else {
      setFormData({
        ...formData,
        [field]: current.filter((item) => item !== value),
      });
    }
  };

  const handleHistoryOpen = () => {
    setIsHistoryOpen(true);
    fetchHistory();
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

  const data = isEditing ? formData : interview.content;

  // Edit mode form
  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={["general", "preferences", "allergies", "health", "supplements", "goals"]} className="space-y-4">
          {/* General Info */}
          <AccordionItem value="general" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">
              Informacje ogólne
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Wzrost (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="np. 175"
                    value={formData.height || ""}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Waga (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="np. 70"
                    value={formData.weight || ""}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Poziom aktywności</Label>
                  <Select
                    value={formData.activity_level || ""}
                    onValueChange={(value) => setFormData({ ...formData, activity_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Siedzący tryb życia</SelectItem>
                      <SelectItem value="light">Lekka aktywność</SelectItem>
                      <SelectItem value="moderate">Umiarkowana aktywność</SelectItem>
                      <SelectItem value="active">Aktywny</SelectItem>
                      <SelectItem value="very_active">Bardzo aktywny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sleep_hours">Godziny snu</Label>
                  <Input
                    id="sleep_hours"
                    type="number"
                    placeholder="np. 7"
                    value={formData.sleep_hours || ""}
                    onChange={(e) => setFormData({ ...formData, sleep_hours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Poziom stresu</Label>
                  <Select
                    value={formData.stress_level || ""}
                    onValueChange={(value) => setFormData({ ...formData, stress_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niski</SelectItem>
                      <SelectItem value="moderate">Umiarkowany</SelectItem>
                      <SelectItem value="high">Wysoki</SelectItem>
                      <SelectItem value="very_high">Bardzo wysoki</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Preferences */}
          <AccordionItem value="preferences" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">
              Preferencje żywieniowe
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ diety</Label>
                  <Select
                    value={formData.diet_type || ""}
                    onValueChange={(value) => setFormData({ ...formData, diet_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traditional">Tradycyjna</SelectItem>
                      <SelectItem value="vegetarian">Wegetariańska</SelectItem>
                      <SelectItem value="vegan">Wegańska</SelectItem>
                      <SelectItem value="pescatarian">Peskatariańska</SelectItem>
                      <SelectItem value="keto">Ketogeniczna</SelectItem>
                      <SelectItem value="paleo">Paleo</SelectItem>
                      <SelectItem value="other">Inna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Liczba posiłków dziennie</Label>
                  <Select
                    value={formData.meal_frequency || ""}
                    onValueChange={(value) => setFormData({ ...formData, meal_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 posiłki</SelectItem>
                      <SelectItem value="3">3 posiłki</SelectItem>
                      <SelectItem value="4">4 posiłki</SelectItem>
                      <SelectItem value="5">5 posiłków</SelectItem>
                      <SelectItem value="6+">6 lub więcej</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favorite_foods">Ulubione produkty</Label>
                <Textarea
                  id="favorite_foods"
                  placeholder="Wymień produkty, które lubisz jeść..."
                  value={formData.favorite_foods || ""}
                  onChange={(e) => setFormData({ ...formData, favorite_foods: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disliked_foods">Nielubiane produkty</Label>
                <Textarea
                  id="disliked_foods"
                  placeholder="Wymień produkty, których nie lubisz..."
                  value={formData.disliked_foods || ""}
                  onChange={(e) => setFormData({ ...formData, disliked_foods: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="snacking_habits">Nawyki przekąskowe</Label>
                <Textarea
                  id="snacking_habits"
                  placeholder="Opisz swoje nawyki związane z przekąskami..."
                  value={formData.snacking_habits || ""}
                  onChange={(e) => setFormData({ ...formData, snacking_habits: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Allergies */}
          <AccordionItem value="allergies" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">
              Alergie i nietolerancje
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <Label>Alergie pokarmowe</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allergyOptions.map((allergy) => (
                    <div key={allergy} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergy-${allergy}`}
                        checked={(formData.allergies || []).includes(allergy)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange("allergies", allergy, checked as boolean)
                        }
                      />
                      <Label htmlFor={`allergy-${allergy}`} className="text-sm font-normal">
                        {allergy}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Nietolerancje</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {intoleranceOptions.map((intolerance) => (
                    <div key={intolerance} className="flex items-center space-x-2">
                      <Checkbox
                        id={`intolerance-${intolerance}`}
                        checked={(formData.intolerances || []).includes(intolerance)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange("intolerances", intolerance, checked as boolean)
                        }
                      />
                      <Label htmlFor={`intolerance-${intolerance}`} className="text-sm font-normal">
                        {intolerance}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_allergies">Inne alergie/nietolerancje</Label>
                <Textarea
                  id="other_allergies"
                  placeholder="Opisz inne alergie lub nietolerancje..."
                  value={formData.other_allergies || ""}
                  onChange={(e) => setFormData({ ...formData, other_allergies: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Health Issues */}
          <AccordionItem value="health" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">
              Dolegliwości zdrowotne
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="digestive_issues">Problemy trawienne</Label>
                <Textarea
                  id="digestive_issues"
                  placeholder="Opisz ewentualne problemy trawienne..."
                  value={formData.digestive_issues || ""}
                  onChange={(e) => setFormData({ ...formData, digestive_issues: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="energy_issues">Problemy z energią</Label>
                <Textarea
                  id="energy_issues"
                  placeholder="Opisz ewentualne problemy z energią..."
                  value={formData.energy_issues || ""}
                  onChange={(e) => setFormData({ ...formData, energy_issues: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skin_issues">Problemy skórne</Label>
                <Textarea
                  id="skin_issues"
                  placeholder="Opisz ewentualne problemy skórne..."
                  value={formData.skin_issues || ""}
                  onChange={(e) => setFormData({ ...formData, skin_issues: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_health_issues">Inne dolegliwości</Label>
                <Textarea
                  id="other_health_issues"
                  placeholder="Opisz inne dolegliwości zdrowotne..."
                  value={formData.other_health_issues || ""}
                  onChange={(e) => setFormData({ ...formData, other_health_issues: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Supplements */}
          <AccordionItem value="supplements" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">
              Suplementacja i leki
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="current_supplements">Aktualne suplementy</Label>
                <Textarea
                  id="current_supplements"
                  placeholder="Wymień aktualnie przyjmowane suplementy..."
                  value={formData.current_supplements || ""}
                  onChange={(e) => setFormData({ ...formData, current_supplements: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="past_supplements">Wcześniejsze suplementy</Label>
                <Textarea
                  id="past_supplements"
                  placeholder="Wymień suplementy przyjmowane w przeszłości..."
                  value={formData.past_supplements || ""}
                  onChange={(e) => setFormData({ ...formData, past_supplements: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medications">Przyjmowane leki</Label>
                <Textarea
                  id="medications"
                  placeholder="Wymień przyjmowane leki..."
                  value={formData.medications || ""}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Goals */}
          <AccordionItem value="goals" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">
              Cele zdrowotne
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="health_goals">Cele zdrowotne</Label>
                <Textarea
                  id="health_goals"
                  placeholder="Opisz swoje cele zdrowotne..."
                  value={formData.health_goals || ""}
                  onChange={(e) => setFormData({ ...formData, health_goals: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cele wagowe</Label>
                <Select
                  value={formData.weight_goals || ""}
                  onValueChange={(value) => setFormData({ ...formData, weight_goals: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose">Chce schudnąć</SelectItem>
                    <SelectItem value="maintain">Chce utrzymać wagę</SelectItem>
                    <SelectItem value="gain">Chce przytyć</SelectItem>
                    <SelectItem value="muscle">Chce zbudować mięśnie</SelectItem>
                    <SelectItem value="none">Brak celów wagowych</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_notes">Dodatkowe uwagi</Label>
                <Textarea
                  id="additional_notes"
                  placeholder="Dodatkowe informacje..."
                  value={formData.additional_notes || ""}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  // View mode (read-only)
  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={handleHistoryOpen}>
              <History className="h-4 w-4 mr-2" />
              Historia zmian
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historia zmian wywiadu</DialogTitle>
            </DialogHeader>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Brak historii zmian
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((entry) => (
                  <Card key={entry.id}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">
                        {format(new Date(entry.changed_at), "d MMMM yyyy, HH:mm", { locale: pl })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Wzrost:</span>
                        <span>{entry.content.height || "-"} cm</span>
                        <span className="text-muted-foreground">Waga:</span>
                        <span>{entry.content.weight || "-"} kg</span>
                        <span className="text-muted-foreground">Aktywność:</span>
                        <span>{activityLabels[entry.content.activity_level || ""] || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Button onClick={handleEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edytuj wywiad
        </Button>
      </div>

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