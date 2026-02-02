import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanCard from "@/components/dashboard/PlanCard";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import ResultsUpload from "@/components/dashboard/ResultsUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // 2. Pobierz aktywny profil z localStorage
    const activeProfileId = localStorage.getItem("activeProfileId");

    // 3. Pobierz zalecenia
    let query = supabase
      .from("recommendations")
      .select("id, title, recommendation_date")
      .eq("patient_id", patient.id)
      .order("recommendation_date", { ascending: false })
      .limit(5);

    // Filtruj po profilu jeśli jest wybrany
    if (activeProfileId) {
      query = query.eq("person_profile_id", activeProfileId);
    }

    const { data } = await query;
    setRecommendations(data || []);
    setIsLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Witamy w Avatar!
          </h1>
        </div>

        {/* Main content - two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left column - Photo upload card */}
          <div className="lg:col-span-1">
            <PhotoUpload className="h-full" />
          </div>

          {/* Right column - Plans selection */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Twoja ścieżka pracy z ciałem – wybierz plan, aby rozpocząć diagnostykę:
            </h2>
            <div className="space-y-4">
              <PlanCard
                title="Indywidualny program wsparcia ciała"
                description="Płatność miesięczna umożliwiająca regularne badanie i monitorowanie stanu zdrowia. Zawiera: jadłospis, analiza niedoborów, plan suplementacji."
                price="90 zł"
                priceUnit="miesiąc"
                onSelect={() => navigate("/payment")}
              />
              <PlanCard
                title="Pakiet regeneracyjny jednorazowy"
                description="Płacisz raz i otrzymujesz wyniki na podstawie aktualnego stanu zdrowia. Zawiera: jadłospis, analiza niedoborów, zalecenia dietetyczne."
                price="150 zł"
                onSelect={() => navigate("/payment")}
              />
            </div>
          </div>
        </div>

        {/* Health recommendations section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Zalecenia zdrowotne</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Ładowanie zaleceń...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-muted-foreground">
                Brak zaleceń zdrowotnych dla tego profilu. Po wykonaniu diagnostyki pojawią się tu Twoje dokumenty do pobrania.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground mb-4">
                  Tutaj znajdziesz materiały i rekomendacje dotyczące zdrowia, przygotowane przez specjalistów Avatar Centrum Zdrowia. Kliknij w dokument, aby go otworzyć.
                </p>
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => navigate("/dashboard/recommendations")}
                    className="flex items-center gap-3 w-full p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">
                        {rec.title || `Zalecenia z dnia ${format(new Date(rec.recommendation_date), "d MMMM yyyy", { locale: pl })}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(rec.recommendation_date), "d MMMM yyyy", { locale: pl })}
                      </p>
                    </div>
                  </button>
                ))}
                {recommendations.length >= 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate("/dashboard/recommendations")}
                  >
                    Zobacz wszystkie zalecenia
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload previous results section */}
        <ResultsUpload />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
