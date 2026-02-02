import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface RecommendationData {
  id: string;
  title: string | null;
  content: string | null;
  tags: string[] | null;
  recommendation_date: string;
  body_systems: string[] | null;
  diagnosis_summary: string | null;
  dietary_recommendations: string | null;
  supplementation_program: string | null;
  shop_links: string | null;
  supporting_therapies: string | null;
  pdf_url: string | null;
  profile_name: string;
}

const RecommendationDownload = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError("Brak tokenu w linku");
      setIsLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-download-token", {
        body: {
          token,
          access_type: "view",
          user_agent: navigator.userAgent,
        },
      });

      if (fnError) {
        console.error("Function error:", fnError);
        setError("Wystąpił błąd podczas weryfikacji tokenu");
        setIsLoading(false);
        return;
      }

      if (!data.valid) {
        setError(data.error || "Nieprawidłowy token");
        setIsExpired(data.expired || false);
        setIsLoading(false);
        return;
      }

      setRecommendation(data.recommendation);
    } catch (err) {
      console.error("Error verifying token:", err);
      setError("Wystąpił błąd podczas weryfikacji tokenu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!recommendation?.pdf_url) return;
    
    // Log download
    try {
      await supabase.functions.invoke("verify-download-token", {
        body: {
          token,
          access_type: "download",
          user_agent: navigator.userAgent,
        },
      });
    } catch (error) {
      console.error("Error logging download:", error);
    }

    window.open(recommendation.pdf_url, "_blank");
  };

  const bodySystemLabels: Record<string, string> = {
    nerwowy: "Układ nerwowy",
    hormonalny: "Układ hormonalny",
    krazeniowy: "Układ krążenia",
    limfatyczny: "Układ limfatyczny",
    oddechowy: "Układ oddechowy",
    moczowy: "Układ moczowy",
    miesniowy: "Układ mięśniowy",
    odpornosciowy: "Układ odpornościowy",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Weryfikacja tokenu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            {isExpired ? (
              <Clock className="h-16 w-16 mx-auto text-warning mb-4" />
            ) : (
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            )}
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isExpired ? "Link wygasł" : "Błąd dostępu"}
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            {isExpired && (
              <p className="text-sm text-muted-foreground mb-6">
                Skontaktuj się z nami, aby otrzymać nowy link do pobrania zalecenia.
              </p>
            )}
            <Link to="/login">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Przejdź do logowania
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!recommendation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">AVATAR</h1>
          <p className="text-muted-foreground">Indywidualny program wsparcia ciała</p>
        </div>

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {recommendation.title || "Zalecenie"}
                </CardTitle>
                {recommendation.profile_name && (
                  <p className="text-muted-foreground mt-1">
                    Dla: {recommendation.profile_name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Data: {format(
                    new Date(recommendation.recommendation_date),
                    "d MMMM yyyy",
                    { locale: pl }
                  )}
                </p>
              </div>
              {recommendation.pdf_url && (
                <Button onClick={handleDownloadPdf} className="gap-2 shrink-0">
                  <Download className="h-4 w-4" />
                  Pobierz PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Body Systems */}
            {recommendation.body_systems && recommendation.body_systems.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Układy ciała:</h3>
                <div className="flex flex-wrap gap-2">
                  {recommendation.body_systems.map((system) => (
                    <Badge key={system} variant="secondary">
                      {bodySystemLabels[system] || system}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {recommendation.tags && recommendation.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Tagi:</h3>
                <div className="flex flex-wrap gap-2">
                  {recommendation.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnosis Summary */}
            {recommendation.diagnosis_summary && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Podsumowanie diagnozy:</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">
                    {recommendation.diagnosis_summary}
                  </p>
                </div>
              </div>
            )}

            {/* Dietary Recommendations */}
            {recommendation.dietary_recommendations && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Zalecenia dietetyczne:</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">
                    {recommendation.dietary_recommendations}
                  </p>
                </div>
              </div>
            )}

            {/* Supplementation */}
            {recommendation.supplementation_program && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Program suplementacji:</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">
                    {recommendation.supplementation_program}
                  </p>
                </div>
              </div>
            )}

            {/* Supporting Therapies */}
            {recommendation.supporting_therapies && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Terapie wspierające:</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">
                    {recommendation.supporting_therapies}
                  </p>
                </div>
              </div>
            )}

            {/* Shop Links */}
            {recommendation.shop_links && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Linki do sklepu:</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">
                    {recommendation.shop_links}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Content */}
            {recommendation.content && (
              <div className="mb-6">
                <h3 className="font-medium text-foreground mb-2">Dodatkowe informacje:</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">
                    {recommendation.content}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AVATAR - Wszystkie prawa zastrzeżone</p>
          <p className="mt-1">
            <a href="https://eavatar.diet" className="hover:text-foreground transition-colors">
              eavatar.diet
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecommendationDownload;
