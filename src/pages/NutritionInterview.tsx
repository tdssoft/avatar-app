import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, User, Loader2 } from "lucide-react";

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

const NutritionInterview = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InterviewData>(defaultInterviewData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
      setFormData({ ...defaultInterviewData, ...content });
      setLastSaved(new Date(data.last_updated_at));
    } else {
      setInterviewId(null);
      setFormData(defaultInterviewData);
      setLastSaved(null);
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

      setLastSaved(new Date());
      toast.success("Wywiad został zapisany");
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
    if (checked) {
      setFormData({ ...formData, [field]: [...formData[field], value] });
    } else {
      setFormData({
        ...formData,
        [field]: formData[field].filter((item) => item !== value),
      });
    }
  };

  const getProfileName = () => {
    const profile = profiles.find((p) => p.id === selectedProfileId);
    return profile?.name || "";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Wywiad żywieniowy
            </h1>
            <p className="text-muted-foreground mt-1">
              Uzupełnij informacje o swoich preferencjach i zdrowiu
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
        ) : (
          <div className="space-y-6">
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

            {/* Save button */}
            <Card>
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                <div className="text-sm text-muted-foreground">
                  {lastSaved && (
                    <span>
                      Ostatni zapis: {lastSaved.toLocaleDateString("pl-PL")}{" "}
                      {lastSaved.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default NutritionInterview;
