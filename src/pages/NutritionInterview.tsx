import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, User, Loader2, Edit, X, ClipboardList, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface PersonProfile {
  id: string;
  name: string;
  is_primary: boolean;
}

interface InterviewData {
  // Sekcja 1: Ogólne
  height: string;
  weight: string;
  activity_level: string;
  sleep_hours: string;
  stress_level: string;
  
  // Sekcja 2: Preferencje żywieniowe
  diet_type: string;
  favorite_foods: string;
  disliked_foods: string;
  meal_frequency: string;
  snacking_habits: string;
  
  // Sekcja 3: Alergie i nietolerancje
  allergies: string[];
  intolerances: string[];
  other_allergies: string;
  
  // Sekcja 4: Dolegliwości
  digestive_issues: string;
  energy_issues: string;
  skin_issues: string;
  other_health_issues: string;
  
  // Sekcja 5: Suplementacja
  current_supplements: string;
  past_supplements: string;
  medications: string;
  
  // Sekcja 6: Cele
  health_goals: string;
  weight_goals: string;
  additional_notes: string;
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

// Label mappings for display
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
  lose: "Chcę schudnąć",
  maintain: "Chcę utrzymać wagę",
  gain: "Chcę przytyć",
  muscle: "Chcę zbudować mięśnie",
  none: "Nie mam celów wagowych",
};

const mealFrequencyLabels: Record<string, string> = {
  "2": "2 posiłki",
  "3": "3 posiłki",
  "4": "4 posiłki",
  "5": "5 posiłków",
  "6+": "6 lub więcej",
};

// Helper components for read-only view
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

const NutritionInterview = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interview, setInterview] = useState<{
    content: InterviewData;
    last_updated_at: string;
  } | null>(null);
  const [formData, setFormData] = useState<InterviewData>(defaultInterviewData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProfileId) {
      fetchInterview();
    }
  }, [selectedProfileId]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("person_profiles")
      .select("id, name, is_primary")
      .eq("account_user_id", user?.id)
      .order("is_primary", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }

    setProfiles(data || []);
    
    // Auto-select primary profile
    const primaryProfile = data?.find((p) => p.is_primary);
    if (primaryProfile) {
      setSelectedProfileId(primaryProfile.id);
    } else if (data && data.length > 0) {
      setSelectedProfileId(data[0].id);
    }
  };

  const fetchInterview = async () => {
    setIsLoading(true);
    setIsEditing(false);
    
    const { data, error } = await supabase
      .from("nutrition_interviews")
      .select("id, content, last_updated_at")
      .eq("person_profile_id", selectedProfileId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching interview:", error);
      toast.error("Nie udało się pobrać wywiadu");
      setIsLoading(false);
      return;
    }

    if (data) {
      setInterviewId(data.id);
      const content = data.content as unknown as InterviewData;
      setInterview({
        content: { ...defaultInterviewData, ...content },
        last_updated_at: data.last_updated_at,
      });
      setFormData({ ...defaultInterviewData, ...content });
    } else {
      setInterviewId(null);
      setInterview(null);
      setFormData(defaultInterviewData);
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedProfileId) {
      toast.error("Wybierz profil");
      return;
    }

    setIsSaving(true);

    try {
      // Cast to Json type for Supabase
      const contentJson = JSON.parse(JSON.stringify(formData));
      
      if (interviewId) {
        // Update existing
        const { error } = await supabase
          .from("nutrition_interviews")
          .update({
            content: contentJson,
            last_updated_at: new Date().toISOString(),
            last_updated_by: user?.id,
          })
          .eq("id", interviewId);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("nutrition_interviews")
          .insert([{
            person_profile_id: selectedProfileId,
            content: contentJson,
            last_updated_by: user?.id,
          }])
          .select("id")
          .single();

        if (error) throw error;
        setInterviewId(data.id);
      }

      toast.success("Wywiad został zapisany");
      setIsEditing(false);
      fetchInterview();
    } catch (error) {
      console.error("Error saving interview:", error);
      toast.error("Nie udało się zapisać wywiadu");
    } finally {
      setIsSaving(false);
    }
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
    } else {
      setFormData(defaultInterviewData);
    }
    setIsEditing(false);
  };

  const handleStartNew = () => {
    setFormData(defaultInterviewData);
    setIsEditing(true);
  };

  const handleCheckboxChange = (
    field: "allergies" | "intolerances",
    value: string,
    checked: boolean
  ) => {
    if (checked) {
      setFormData({ ...formData, [field]: [...formData[field], value] });
    } else {
      setFormData({
        ...formData,
        [field]: formData[field].filter((item) => item !== value),
      });
    }
  };

  // Empty state - no interview exists
  const renderEmptyState = () => (
    <Card>
      <CardContent className="py-12 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Brak wywiadu żywieniowego
        </h3>
        <p className="text-muted-foreground mb-6">
          Wypełnij wywiad żywieniowy, aby otrzymać spersonalizowane zalecenia.
        </p>
        <Button onClick={handleStartNew} className="gap-2">
          <Edit className="h-4 w-4" />
          Rozpocznij wywiad
        </Button>
      </CardContent>
    </Card>
  );

  // Read-only view of saved interview
  const renderInterviewView = () => {
    if (!interview) return null;
    const data = interview.content;

    return (
      <div className="space-y-6">
        {/* Header with edit button */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Ostatnia aktualizacja:{" "}
            {format(new Date(interview.last_updated_at), "d MMMM yyyy, HH:mm", { locale: pl })}
          </div>
          <Button onClick={handleEdit} variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edytuj wywiad
          </Button>
        </div>

        {/* General info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informacje ogólne</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <InfoRow label="Wzrost" value={data.height ? `${data.height} cm` : undefined} />
                <InfoRow label="Waga" value={data.weight ? `${data.weight} kg` : undefined} />
                <InfoRow label="Godziny snu" value={data.sleep_hours ? `${data.sleep_hours} h` : undefined} />
              </div>
              <div className="space-y-2">
                <InfoRow label="Poziom aktywności" value={activityLabels[data.activity_level]} />
                <InfoRow label="Poziom stresu" value={stressLabels[data.stress_level]} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferencje żywieniowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Typ diety" value={dietLabels[data.diet_type]} />
            <InfoRow label="Liczba posiłków" value={mealFrequencyLabels[data.meal_frequency]} />
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
              <div className="space-y-2">
                <Label className="text-muted-foreground">Alergie pokarmowe</Label>
                <div className="flex flex-wrap gap-2">
                  {data.allergies.map((allergy) => (
                    <Badge key={allergy} variant="secondary">{allergy}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.intolerances && data.intolerances.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nietolerancje</Label>
                <div className="flex flex-wrap gap-2">
                  {data.intolerances.map((intolerance) => (
                    <Badge key={intolerance} variant="secondary">{intolerance}</Badge>
                  ))}
                </div>
              </div>
            )}
            <TextSection label="Inne alergie/nietolerancje" value={data.other_allergies} />
          </CardContent>
        </Card>

        {/* Health issues */}
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
            <InfoRow label="Cele wagowe" value={weightGoalLabels[data.weight_goals]} />
            <TextSection label="Dodatkowe uwagi" value={data.additional_notes} />
          </CardContent>
        </Card>
      </div>
    );
  };

  // Edit form
  const renderEditForm = () => (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-2" />
          Anuluj
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Zapisywanie..." : "Zapisz wywiad"}
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["general", "preferences"]} className="space-y-4">
        {/* Sekcja 1: Ogólne */}
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
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Waga (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="np. 70"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Poziom aktywności</Label>
                <Select
                  value={formData.activity_level}
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
                  value={formData.sleep_hours}
                  onChange={(e) => setFormData({ ...formData, sleep_hours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Poziom stresu</Label>
                <Select
                  value={formData.stress_level}
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

        {/* Sekcja 2: Preferencje żywieniowe */}
        <AccordionItem value="preferences" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            Preferencje żywieniowe
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ diety</Label>
                <Select
                  value={formData.diet_type}
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
                  value={formData.meal_frequency}
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
                value={formData.favorite_foods}
                onChange={(e) => setFormData({ ...formData, favorite_foods: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disliked_foods">Nielubiane produkty</Label>
              <Textarea
                id="disliked_foods"
                placeholder="Wymień produkty, których nie lubisz..."
                value={formData.disliked_foods}
                onChange={(e) => setFormData({ ...formData, disliked_foods: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snacking_habits">Nawyki przekąskowe</Label>
              <Textarea
                id="snacking_habits"
                placeholder="Opisz swoje nawyki związane z przekąskami..."
                value={formData.snacking_habits}
                onChange={(e) => setFormData({ ...formData, snacking_habits: e.target.value })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sekcja 3: Alergie */}
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
                      checked={formData.allergies.includes(allergy)}
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
                      checked={formData.intolerances.includes(intolerance)}
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
                value={formData.other_allergies}
                onChange={(e) => setFormData({ ...formData, other_allergies: e.target.value })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sekcja 4: Dolegliwości */}
        <AccordionItem value="health" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            Dolegliwości zdrowotne
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="digestive_issues">Problemy trawienne</Label>
              <Textarea
                id="digestive_issues"
                placeholder="Opisz ewentualne problemy z trawieniem..."
                value={formData.digestive_issues}
                onChange={(e) => setFormData({ ...formData, digestive_issues: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="energy_issues">Problemy z energią</Label>
              <Textarea
                id="energy_issues"
                placeholder="Opisz problemy z energią, zmęczenie..."
                value={formData.energy_issues}
                onChange={(e) => setFormData({ ...formData, energy_issues: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skin_issues">Problemy skórne</Label>
              <Textarea
                id="skin_issues"
                placeholder="Opisz ewentualne problemy ze skórą..."
                value={formData.skin_issues}
                onChange={(e) => setFormData({ ...formData, skin_issues: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other_health_issues">Inne dolegliwości</Label>
              <Textarea
                id="other_health_issues"
                placeholder="Opisz inne dolegliwości zdrowotne..."
                value={formData.other_health_issues}
                onChange={(e) => setFormData({ ...formData, other_health_issues: e.target.value })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sekcja 5: Suplementacja */}
        <AccordionItem value="supplements" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            Suplementacja i leki
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="current_supplements">Aktualne suplementy</Label>
              <Textarea
                id="current_supplements"
                placeholder="Wymień obecnie przyjmowane suplementy..."
                value={formData.current_supplements}
                onChange={(e) => setFormData({ ...formData, current_supplements: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="past_supplements">Wcześniejsze suplementy</Label>
              <Textarea
                id="past_supplements"
                placeholder="Wymień suplementy, które wcześniej stosowałeś..."
                value={formData.past_supplements}
                onChange={(e) => setFormData({ ...formData, past_supplements: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medications">Przyjmowane leki</Label>
              <Textarea
                id="medications"
                placeholder="Wymień przyjmowane leki..."
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sekcja 6: Cele */}
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
                value={formData.health_goals}
                onChange={(e) => setFormData({ ...formData, health_goals: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cele wagowe</Label>
              <Select
                value={formData.weight_goals}
                onValueChange={(value) => setFormData({ ...formData, weight_goals: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Chcę schudnąć</SelectItem>
                  <SelectItem value="maintain">Chcę utrzymać wagę</SelectItem>
                  <SelectItem value="gain">Chcę przytyć</SelectItem>
                  <SelectItem value="muscle">Chcę zbudować mięśnie</SelectItem>
                  <SelectItem value="none">Nie mam celów wagowych</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional_notes">Dodatkowe uwagi</Label>
              <Textarea
                id="additional_notes"
                placeholder="Inne informacje, które chcesz przekazać..."
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Bottom save button */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center justify-end gap-4 py-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Zapisywanie..." : "Zapisz wywiad"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Wywiad żywieniowy
            </h1>
            <p className="text-muted-foreground mt-1">
              {interview ? "Podgląd i edycja Twojego wywiadu" : "Uzupełnij informacje o swoich preferencjach i zdrowiu"}
            </p>
          </div>

          {profiles.length > 1 && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Wybierz profil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                      {profile.is_primary && " (główny)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !interview && !isEditing ? (
          renderEmptyState()
        ) : isEditing ? (
          renderEditForm()
        ) : (
          renderInterviewView()
        )}
      </div>
    </DashboardLayout>
  );
};

export default NutritionInterview;
