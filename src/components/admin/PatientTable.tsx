import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Patient {
  id: string;
  user_id: string;
  subscription_status: string;
  diagnosis_status: string;
  last_communication_at: string | null;
  created_at: string;
  tags?: string[] | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
  primary_person_profile?: {
    name: string | null;
  } | null;
  referral?: {
    referrer_code: string;
    referrer_name: string | null;
  } | null;
}

interface PatientTableProps {
  patients: Patient[];
  isLoading: boolean;
}

const PatientTable = ({ patients, isLoading }: PatientTableProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aktywna":
        return <Badge variant="default">Aktywna</Badge>;
      case "Wygasła":
        return <Badge variant="destructive">Wygasła</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDiagnosisBadge = (status: string) => {
    switch (status) {
      case "Wykonana":
        return <Badge variant="default">Wykonana</Badge>;
      case "Oczekuje":
        return <Badge variant="outline">Oczekuje</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Brak pacjentów do wyświetlenia
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Imię i nazwisko</TableHead>
            <TableHead className="font-semibold">Polecony przez</TableHead>
            <TableHead className="font-semibold">Subskrypcja</TableHead>
            <TableHead className="font-semibold">Diagnoza</TableHead>
            <TableHead className="font-semibold">Akcja</TableHead>
            <TableHead className="font-semibold">Ostatnia komunikacja</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => {
            const firstName = patient.profiles?.first_name?.trim() || "";
            const lastName = patient.profiles?.last_name?.trim() || "";
            const profileName = `${firstName} ${lastName}`.trim();
            const personProfileName = patient.primary_person_profile?.name?.trim() || "";
            const fullName = profileName || personProfileName || `Użytkownik ${patient.user_id.slice(0, 8)}`;
              
            return (
              <TableRow key={patient.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{fullName}</TableCell>
                <TableCell>
                  {patient.referral ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-primary">
                        {patient.referral.referrer_name || "Partner"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.referral.referrer_code}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(patient.subscription_status)}</TableCell>
                <TableCell>{getDiagnosisBadge(patient.diagnosis_status)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/patient/${patient.id}`)}
                  >
                    Profil pacjenta
                  </Button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {patient.last_communication_at
                    ? format(new Date(patient.last_communication_at), "dd.MM.yyyy HH:mm", { locale: pl })
                    : "Brak"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatientTable;
