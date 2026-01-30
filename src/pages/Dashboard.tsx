import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Upload } from "lucide-react";
import PlanCard from "@/components/dashboard/PlanCard";

const Dashboard = () => {
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
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  Twoje zdjęcie
                  <Info className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <button className="text-muted-foreground underline underline-offset-4 text-sm font-medium hover:text-foreground">
                  Wgraj swoje zdjęcie
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Plans selection */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Wybierz odpowiedni plan aby rozpocząć diagnostykę:
            </h2>
            <div className="space-y-4">
              <PlanCard
                title="Diagnostyka i kuracja miesięczna"
                description="Płatność miesięczna umożliwiająca regularne badanie i monitorowanie stanu zdrowia."
                price="90 zł"
                priceUnit="miesiąc"
              />
              <PlanCard
                title="Diagnostyka i kuracja jednorazowa"
                description="Płacisz raz i otrzymujesz wyniki na podstawie aktualnego stanu zdrowia."
                price="150 zł"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Jeśli posiadasz wyniki poprzednich badań, wgraj je tutaj:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Przeciągnij pliki tutaj lub kliknij, aby wybrać
              </p>
              <Button variant="outline">
                Wybierz pliki
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
