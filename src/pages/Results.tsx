import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

// Mock data for results
const mockResults = [
  {
    id: "1",
    name: "Diagnostyka pełna",
    date: "2024-01-15",
    status: "completed",
    summary: [
      "Niedobór witaminy D3",
      "Obciążenie wątroby - zalecana detoksykacja",
      "Nietolerancja laktozy",
    ],
  },
  {
    id: "2",
    name: "Kontrola postępów",
    date: "2024-02-20",
    status: "completed",
    summary: [
      "Poprawa poziomu witaminy D3",
      "Wątroba w lepszej kondycji",
      "Zalecana kontynuacja diety bezlaktozowej",
    ],
  },
  {
    id: "3",
    name: "Aktualizacja planu",
    date: "2024-03-10",
    status: "pending",
    summary: [],
  },
];

const Results = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Twoje wyniki
          </h1>
          <p className="text-muted-foreground">
            Historia Twoich diagnoz i planów terapii
          </p>
        </div>

        {mockResults.length > 0 ? (
          <div className="space-y-6">
            {/* Results table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historia diagnoz</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.name}
                        </TableCell>
                        <TableCell>
                          {new Date(result.date).toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              result.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {result.status === "completed"
                              ? "Zakończona"
                              : "W trakcie"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Latest results details */}
            {mockResults
              .filter((r) => r.status === "completed")
              .map((result) => (
                <Card key={result.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-accent" />
                      {result.name} -{" "}
                      {new Date(result.date).toLocaleDateString("pl-PL")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium mb-3">Główne wnioski:</h4>
                    <ul className="space-y-2">
                      {result.summary.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-muted-foreground"
                        >
                          <span className="text-accent mt-1.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Brak wyników
              </h3>
              <p className="text-muted-foreground">
                Nie masz jeszcze żadnych wyników diagnostyki.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Results;
