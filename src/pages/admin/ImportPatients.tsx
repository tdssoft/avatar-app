import { useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  created_accounts: number;
  created_profiles: number;
  updated_records: number;
  errors: Array<{ row: number; message: string }>;
}

const expectedColumns = [
  { id: "email", label: "Email", required: true },
  { id: "first_name", label: "Imię", required: true },
  { id: "last_name", label: "Nazwisko", required: true },
  { id: "phone", label: "Telefon", required: false },
  { id: "profile_name", label: "Nazwa profilu osoby", required: false },
  { id: "birth_date", label: "Data urodzenia", required: false },
  { id: "gender", label: "Płeć", required: false },
];

const ImportPatients = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");

  const parseCSV = (text: string): { headers: string[]; rows: CSVRow[] } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("Plik CSV musi zawierać nagłówki i przynajmniej jeden wiersz danych");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      if (values.length === headers.length) {
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Proszę wybrać plik CSV");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rows } = parseCSV(text);
        setCSVHeaders(headers);
        setCSVData(rows);

        // Auto-map columns with similar names
        const autoMapping: Record<string, string> = {};
        expectedColumns.forEach((col) => {
          const matchingHeader = headers.find(
            (h) =>
              h.toLowerCase() === col.id.toLowerCase() ||
              h.toLowerCase().includes(col.id.toLowerCase()) ||
              h.toLowerCase().includes(col.label.toLowerCase())
          );
          if (matchingHeader) {
            autoMapping[col.id] = matchingHeader;
          }
        });
        setColumnMapping(autoMapping);
        setStep("mapping");
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Nie udało się sparsować pliku CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (targetColumn: string, sourceColumn: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [targetColumn]: sourceColumn === "none" ? "" : sourceColumn,
    }));
  };

  const validateMapping = (): boolean => {
    const requiredColumns = expectedColumns.filter((c) => c.required);
    const missingRequired = requiredColumns.filter((c) => !columnMapping[c.id]);
    
    if (missingRequired.length > 0) {
      toast.error(`Brakuje wymaganych kolumn: ${missingRequired.map((c) => c.label).join(", ")}`);
      return false;
    }
    return true;
  };

  const handleProceedToPreview = () => {
    if (validateMapping()) {
      setStep("preview");
    }
  };

  const handleImport = async () => {
    setIsLoading(true);

    try {
      // Transform data according to mapping
      const transformedData = csvData.map((row) => {
        const transformed: Record<string, string> = {};
        Object.entries(columnMapping).forEach(([target, source]) => {
          if (source) {
            transformed[target] = row[source] || "";
          }
        });
        return transformed;
      });

      const { data, error } = await supabase.functions.invoke("import-patients", {
        body: { data: transformedData },
      });

      if (error) {
        throw error;
      }

      setImportResult(data);
      setStep("result");
      toast.success("Import zakończony");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Nie udało się zaimportować danych");
    } finally {
      setIsLoading(false);
    }
  };

  const resetImport = () => {
    setCSVData([]);
    setCSVHeaders([]);
    setColumnMapping({});
    setImportResult(null);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Import pacjentów</h1>
            <p className="text-white/80">Importuj dane pacjentów z pliku CSV</p>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Wybierz plik CSV
              </CardTitle>
              <CardDescription>
                Plik powinien zawierać kolumny: email, imię, nazwisko (wymagane), telefon, nazwa profilu, data urodzenia, płeć (opcjonalne)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-primary hover:underline">Wybierz plik</span>
                  <span className="text-muted-foreground"> lub przeciągnij tutaj</span>
                </Label>
                <Input
                  id="csv-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">Tylko pliki .csv</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Mapping */}
        {step === "mapping" && (
          <Card>
            <CardHeader>
              <CardTitle>Mapowanie kolumn</CardTitle>
              <CardDescription>
                Dopasuj kolumny z pliku CSV do pól w systemie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expectedColumns.map((col) => (
                  <div key={col.id} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {col.label}
                      {col.required && <Badge variant="destructive" className="text-xs">Wymagane</Badge>}
                    </Label>
                    <Select
                      value={columnMapping[col.id] || "none"}
                      onValueChange={(value) => handleMappingChange(col.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kolumnę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Nie mapuj --</SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={resetImport}>
                  Anuluj
                </Button>
                <Button onClick={handleProceedToPreview}>
                  Dalej - Podgląd danych
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Podgląd danych</CardTitle>
              <CardDescription>
                Sprawdź dane przed importem ({csvData.length} rekordów)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {expectedColumns.map((col) =>
                        columnMapping[col.id] ? (
                          <TableHead key={col.id}>{col.label}</TableHead>
                        ) : null
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        {expectedColumns.map((col) =>
                          columnMapping[col.id] ? (
                            <TableCell key={col.id}>
                              {row[columnMapping[col.id]] || "-"}
                            </TableCell>
                          ) : null
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {csvData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Pokazano 10 z {csvData.length} rekordów
                </p>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Wstecz
                </Button>
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importowanie...
                    </>
                  ) : (
                    "Importuj dane"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Result */}
        {step === "result" && importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Import zakończony
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">
                      {importResult.created_accounts}
                    </p>
                    <p className="text-sm text-muted-foreground">Utworzone konta</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">
                      {importResult.created_profiles}
                    </p>
                    <p className="text-sm text-muted-foreground">Utworzone profile</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">
                      {importResult.updated_records}
                    </p>
                    <p className="text-sm text-muted-foreground">Zaktualizowane rekordy</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Błędy ({importResult.errors.length})
                  </Label>
                  <div className="border rounded-lg overflow-auto max-h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Wiersz</TableHead>
                          <TableHead>Błąd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{error.row}</TableCell>
                            <TableCell className="text-destructive">{error.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={resetImport}>
                  Importuj kolejny plik
                </Button>
                <Button onClick={() => navigate("/admin")}>
                  Wróć do listy pacjentów
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ImportPatients;
