import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, ArrowLeft, Loader2, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const exportFields = [
  { id: "email", label: "Email", category: "account" },
  { id: "first_name", label: "Imię", category: "account" },
  { id: "last_name", label: "Nazwisko", category: "account" },
  { id: "phone", label: "Telefon", category: "account" },
  { id: "profile_name", label: "Nazwa profilu osoby", category: "profile" },
  { id: "birth_date", label: "Data urodzenia", category: "profile" },
  { id: "gender", label: "Płeć", category: "profile" },
  { id: "subscription_status", label: "Status subskrypcji", category: "patient" },
  { id: "diagnosis_status", label: "Status diagnozy", category: "patient" },
  { id: "created_at", label: "Data rejestracji", category: "patient" },
  { id: "recommendations_count", label: "Liczba zaleceń", category: "stats" },
  { id: "last_recommendation_date", label: "Data ostatniego zalecenia", category: "stats" },
];

const ExportData = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    exportFields.map((f) => f.id)
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAll = () => {
    setSelectedFields(exportFields.map((f) => f.id));
  };

  const deselectAll = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Wybierz przynajmniej jedno pole do eksportu");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("export-data", {
        body: {
          fields: selectedFields,
          filters: {
            date_from: dateFrom || null,
            date_to: dateTo || null,
            subscription_status: subscriptionFilter !== "all" ? subscriptionFilter : null,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Create and download CSV
      const csvContent = data.csv;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eksport_pacjentow_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Eksportowano ${data.count} rekordów`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Nie udało się wyeksportować danych");
    } finally {
      setIsLoading(false);
    }
  };

  const groupedFields = {
    account: exportFields.filter((f) => f.category === "account"),
    profile: exportFields.filter((f) => f.category === "profile"),
    patient: exportFields.filter((f) => f.category === "patient"),
    stats: exportFields.filter((f) => f.category === "stats"),
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Eksport danych</h1>
            <p className="text-muted-foreground">Eksportuj dane pacjentów do pliku CSV</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtry</CardTitle>
            <CardDescription>Opcjonalnie zawęź zakres eksportowanych danych</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">Data od</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Data do</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status subskrypcji</Label>
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="Aktywna">Aktywna</SelectItem>
                    <SelectItem value="Nieaktywna">Nieaktywna</SelectItem>
                    <SelectItem value="Brak">Brak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wybierz pola</CardTitle>
                <CardDescription>
                  Zaznacz pola, które chcesz uwzględnić w eksporcie
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Zaznacz wszystko
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Odznacz wszystko
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account fields */}
            <div>
              <Label className="text-muted-foreground mb-3 block">Dane konta</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groupedFields.account.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile fields */}
            <div>
              <Label className="text-muted-foreground mb-3 block">Dane profilu osoby</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groupedFields.profile.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient fields */}
            <div>
              <Label className="text-muted-foreground mb-3 block">Dane pacjenta</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groupedFields.patient.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats fields */}
            <div>
              <Label className="text-muted-foreground mb-3 block">Statystyki</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groupedFields.stats.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-muted-foreground">
                <FileSpreadsheet className="h-5 w-5" />
                <span>{selectedFields.length} pól wybranych do eksportu</span>
              </div>
              <Button
                onClick={handleExport}
                disabled={isLoading || selectedFields.length === 0}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eksportowanie...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Eksportuj CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ExportData;
