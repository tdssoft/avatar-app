import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Tag, X } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import PatientTable from "@/components/admin/PatientTable";
import CreatePatientDialog from "@/components/admin/CreatePatientDialog";
import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  user_id: string;
  subscription_status: string;
  diagnosis_status: string;
  last_communication_at: string | null;
  created_at: string;
  tags: string[] | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
  referral?: {
    referrer_code: string;
    referrer_name: string | null;
  } | null;
}

const AdminDashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
        
        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        // Fetch referrals - who referred each patient
        const { data: referralsData, error: referralsError } = await supabase
          .from("referrals")
          .select("referred_user_id, referrer_code, referrer_user_id")
          .in("referred_user_id", userIds);

        if (referralsError) {
          console.error("[AdminDashboard] Error fetching referrals:", referralsError);
        }

        // Get referrer profiles (names of partners who made referrals)
        let referrerProfiles: { user_id: string; first_name: string | null; last_name: string | null }[] = [];
        if (referralsData && referralsData.length > 0) {
          const referrerUserIds = [...new Set(referralsData.map(r => r.referrer_user_id))];
          const { data: referrerProfilesData } = await supabase
            .from("profiles")
            .select("user_id, first_name, last_name")
            .in("user_id", referrerUserIds);
          
          referrerProfiles = referrerProfilesData || [];
        }

        // Merge profiles and referrals with patients
        const patientsWithProfiles = patientsData.map(patient => {
          const profile = profilesData?.find(p => p.user_id === patient.user_id);
          const referral = referralsData?.find(r => r.referred_user_id === patient.user_id);
          
          let referralInfo = null;
          if (referral) {
            const referrerProfile = referrerProfiles.find(p => p.user_id === referral.referrer_user_id);
            const referrerName = referrerProfile?.first_name && referrerProfile?.last_name
              ? `${referrerProfile.first_name} ${referrerProfile.last_name}`
              : null;
            referralInfo = {
              referrer_code: referral.referrer_code,
              referrer_name: referrerName
            };
          }

          return {
            ...patient,
            profiles: profile || { first_name: null, last_name: null, phone: null },
            referral: referralInfo
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

  // Get all unique tags from patients
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    patients.forEach((p) => {
      p.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [patients]);

  // Filter patients based on search and filters
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      // Search filter
      const fullName = `${patient.profiles?.first_name || ""} ${patient.profiles?.last_name || ""}`.toLowerCase();
      const phone = patient.profiles?.phone?.toLowerCase() || "";
      const searchLower = searchQuery.toLowerCase();
      
      const matchesSearch = searchQuery === "" || 
        fullName.includes(searchLower) || 
        phone.includes(searchLower);

      // Subscription filter
      const matchesSubscription = subscriptionFilter === "all" || 
        patient.subscription_status === subscriptionFilter;

      // Diagnosis filter
      const matchesDiagnosis = diagnosisFilter === "all" || 
        patient.diagnosis_status === diagnosisFilter;

      // Tags filter
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some((tag) => patient.tags?.includes(tag));

      return matchesSearch && matchesSubscription && matchesDiagnosis && matchesTags;
    });
  }, [patients, searchQuery, subscriptionFilter, diagnosisFilter, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTagFilters = () => {
    setSelectedTags([]);
  };

  const hasActiveFilters = subscriptionFilter !== "all" || diagnosisFilter !== "all" || selectedTags.length > 0;

  return (
    <AdminLayout>
      {/* Page Header - on turquoise background */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-white/90 text-sm mb-1">Witamy w Avatar!</p>
          <h1 className="text-2xl font-semibold text-white">Pacjenci</h1>
          <p className="text-white/80 mt-1">
            Zarządzaj kontami pacjentów i ich zaleceniami
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-white text-primary hover:bg-white/90">
          <Plus className="h-4 w-4" />
          Dodaj pacjenta
        </Button>
      </div>

      {/* Content Card - white background */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po imieniu, nazwisku lub telefonie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Subskrypcja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="Aktywna">Aktywna</SelectItem>
                <SelectItem value="Wygasła">Wygasła</SelectItem>
                <SelectItem value="Brak">Brak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Diagnoza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="Wykonana">Wykonana</SelectItem>
                <SelectItem value="Oczekuje">Oczekuje</SelectItem>
                <SelectItem value="Brak">Brak</SelectItem>
              </SelectContent>
            </Select>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Tag className="h-4 w-4" />
                    Tagi
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Filtruj po tagach</span>
                      {selectedTags.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearTagFilters}>
                          <X className="h-3 w-3 mr-1" />
                          Wyczyść
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Results count */}
          {searchQuery || hasActiveFilters ? (
            <p className="text-sm text-muted-foreground">
              Znaleziono: {filteredPatients.length} z {patients.length} pacjentów
            </p>
          ) : null}

          {/* Patient Table */}
          <PatientTable patients={filteredPatients} isLoading={isLoading} />
        </div>
      </div>

      {/* Create Patient Dialog */}
      <CreatePatientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchPatients}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
