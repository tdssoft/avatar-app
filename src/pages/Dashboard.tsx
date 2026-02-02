import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanCard from "@/components/dashboard/PlanCard";
import PhotoUpload from "@/components/dashboard/PhotoUpload";
import ResultsUpload from "@/components/dashboard/ResultsUpload";

const Dashboard = () => {
  const navigate = useNavigate();
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
            <p className="text-muted-foreground">
              Tutaj znajdziesz materiały i rekomendacje dotyczące zdrowia, przygotowane przez specjalistów Avatar Centrum Zdrowia. Aby pobrać wybrany dokument, kliknij w jego ikonę lub nazwę.
            </p>
          </CardContent>
        </Card>

        {/* Upload previous results section */}
        <ResultsUpload />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
