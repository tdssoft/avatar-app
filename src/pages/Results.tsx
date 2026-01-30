import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera } from "lucide-react";

const Results = () => {
  const [question, setQuestion] = useState("");

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Nagłówek */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
          Witamy w Avatar!
        </h1>

        {/* Sekcja zalecenia */}
        <div className="flex items-center gap-4 mb-6">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">
            Zalecenia z dnia
          </Label>
          <Select>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Wybierz zalecenie" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="none">Brak zaleceń</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Karta wyników */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="font-bold text-foreground">Brak plików wynikowych</p>
          </CardContent>
        </Card>

        {/* Sekcja pytanie */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-3">
            Zadaj pytanie lub opisz dolegliwości
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Jeśli masz wątpliwości, lub chcesz poznać szczegóły naszych usług zadaj nam pytanie a my odpowiemy mailowo.
          </p>
          <Textarea
            placeholder="Treść pytania"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[120px] mb-4 bg-background"
          />
          <Button variant="default" className="bg-foreground text-background hover:bg-foreground/90">
            Wyślij
          </Button>
        </div>

        {/* Sekcja diagnostyka */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Zleć kolejną diagnostykę:
          </h2>
          {/* Placeholder dla kart pakietów */}
        </div>
      </div>

      {/* Panel boczny - Twoje zdjęcie */}
      <div className="fixed bottom-6 right-6 hidden lg:block">
        <Card className="w-48">
          <CardContent className="p-4 text-center">
            <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm mb-1">Twoje zdjęcie</p>
            <button className="text-xs text-muted-foreground underline hover:text-foreground transition-colors">
              Wgraj swoje zdjęcie
            </button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Results;
