import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BodySystemsOverlay from "@/components/admin/BodySystemsOverlay";

const RecommendationCreator = () => {
  // Avoid TSX generic parsing edge-cases by typing via assertion.
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    diagnosisSummary: "",
    dietaryRecommendations: "",
    supplementationProgram: "",
    shopLinks: "",
    supportingTherapies: "",
  });

  const handleSystemToggle = (systemId: string) => {
    setSelectedSystems((prev) =>
      prev.includes(systemId)
        ? prev.filter((s) => s !== systemId)
        : [...prev, systemId]
    );
  };

  const handleSubmit = async () => {
    if (selectedSystems.length === 0) {
      toast.error("Wybierz przynajmniej jeden układ ciała");
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("recommendations")
        .insert({
          patient_id: id,
          created_by_admin_id: userData.user?.id,
          body_systems: selectedSystems,
          diagnosis_summary: formData.diagnosisSummary || null,
          dietary_recommendations: formData.dietaryRecommendations || null,
          supplementation_program: formData.supplementationProgram || null,
          shop_links: formData.shopLinks || null,
          supporting_therapies: formData.supportingTherapies || null,
        });

      if (error) throw error;

      toast.success("Zalecenia zostały zapisane");
      navigate(`/admin/patient/${id}`);
    } catch (error) {
      console.error("[RecommendationCreator] Error:", error);
      toast.error("Nie udało się zapisać zaleceń");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="h-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/patient/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Kreator zaleceń</h1>
            <p className="text-muted-foreground">Utwórz nowe zalecenia dla pacjenta</p>
          </div>
        </div>

        {/* Layout: on web keep everything inside one viewport by using fixed-height panels */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Interactive Body Systems Overlay */}
          <Card className="min-h-0 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Układy ciała</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-auto">
              <BodySystemsOverlay
                selectedSystems={selectedSystems}
                onToggle={handleSystemToggle}
              />
            </CardContent>
          </Card>

          {/* Right Column - PDF Creator Form */}
          <div className="lg:col-span-2">
            <Card className="min-h-0 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Kreator PDF</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex flex-col gap-4">
                <Tabs defaultValue="diagnosis" className="flex-1 min-h-0 flex flex-col">
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    <TabsTrigger value="diagnosis">Diagnoza</TabsTrigger>
                    <TabsTrigger value="diet">Dieta</TabsTrigger>
                    <TabsTrigger value="supp">Suplementacja</TabsTrigger>
                    <TabsTrigger value="therapies">Terapie</TabsTrigger>
                    <TabsTrigger value="shop">Sklep</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diagnosis" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="diagnosisSummary">Podsumowanie diagnozy</Label>
                      <Textarea
                        id="diagnosisSummary"
                        placeholder="Wprowadź podsumowanie diagnozy..."
                        value={formData.diagnosisSummary}
                        onChange={(e) =>
                          setFormData({ ...formData, diagnosisSummary: e.target.value })
                        }
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="diet" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="dietaryRecommendations">Zalecenia dietetyczne</Label>
                      <Textarea
                        id="dietaryRecommendations"
                        placeholder="Wprowadź zalecenia dietetyczne..."
                        value={formData.dietaryRecommendations}
                        onChange={(e) =>
                          setFormData({ ...formData, dietaryRecommendations: e.target.value })
                        }
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="supp" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="supplementationProgram">Kuracja - Program suplementacji</Label>
                      <Textarea
                        id="supplementationProgram"
                        placeholder="Wprowadź program suplementacji..."
                        value={formData.supplementationProgram}
                        onChange={(e) =>
                          setFormData({ ...formData, supplementationProgram: e.target.value })
                        }
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="therapies" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="supportingTherapies">Terapie wspierające</Label>
                      <Textarea
                        id="supportingTherapies"
                        placeholder="Wprowadź zalecane terapie wspierające..."
                        value={formData.supportingTherapies}
                        onChange={(e) =>
                          setFormData({ ...formData, supportingTherapies: e.target.value })
                        }
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="shop" className="flex-1 min-h-0 mt-4">
                    <div className="h-full flex flex-col gap-2">
                      <Label htmlFor="shopLinks">Linki do sklepu</Label>
                      <Textarea
                        id="shopLinks"
                        placeholder="Wprowadź linki do produktów..."
                        value={formData.shopLinks}
                        onChange={(e) => setFormData({ ...formData, shopLinks: e.target.value })}
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Actions (kept in view) */}
                <div className="flex justify-end gap-3 pt-2 shrink-0">
                  <Button variant="outline" onClick={() => navigate(`/admin/patient/${id}`)}>
                    Powrót
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isLoading ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RecommendationCreator;
