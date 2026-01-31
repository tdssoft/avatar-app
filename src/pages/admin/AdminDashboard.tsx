import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import PatientTable from "@/components/admin/PatientTable";
import CreatePatientDialog from "@/components/admin/CreatePatientDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  user_id: string;
  subscription_status: string;
  diagnosis_status: string;
  last_communication_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
}

const AdminDashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      // First get patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (patientsError) throw patientsError;

      // Then get profiles for each patient
      if (patientsData && patientsData.length > 0) {
        const userIds = patientsData.map(p => p.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        // Merge profiles with patients
        const patientsWithProfiles = patientsData.map(patient => {
          const profile = profilesData?.find(p => p.user_id === patient.user_id);
          return {
            ...patient,
            profiles: profile || { first_name: null, last_name: null, phone: null }
          };
        });

        setPatients(patientsWithProfiles);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error("[AdminDashboard] Error fetching patients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Lista pacjentów</h1>
            <p className="text-muted-foreground mt-1">
              Zarządzaj kontami pacjentów i ich zaleceniami
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj pacjenta
          </Button>
        </div>

        {/* Patient Table */}
        <PatientTable patients={patients} isLoading={isLoading} />

        {/* Create Patient Dialog */}
        <CreatePatientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={fetchPatients}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
