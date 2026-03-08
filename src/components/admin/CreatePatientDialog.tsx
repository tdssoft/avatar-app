import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
}

type ApiErrorPayload = {
  error?: string;
  code?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CreatePatientDialog = ({ open, onOpenChange, onSuccess }: CreatePatientDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const parseFunctionError = async (error: any): Promise<ApiErrorPayload & { status?: number }> => {
    const responseLike = error?.context;
    if (!responseLike) {
      return { error: String(error?.message || ""), code: undefined };
    }

    try {
      const status = Number(responseLike?.status);
      const payload: ApiErrorPayload = await responseLike.json();
      return {
        status,
        error: payload?.error,
        code: payload?.code,
      };
    } catch (_responseParseError) {
      return {
        status: Number(responseLike?.status),
        error: String(error?.message || ""),
      };
    }
  };

  const mapApiErrorToMessage = (errorDetails: ApiErrorPayload & { status?: number }): string => {
    if (errorDetails.code === "EMAIL_EXISTS" || errorDetails.status === 409) {
      return "Konto z tym adresem email już istnieje";
    }

    if (errorDetails.status === 403) {
      return "Brak uprawnień administratora do utworzenia konta pacjenta";
    }

    if (errorDetails.status === 401) {
      return "Sesja wygasła lub brak autoryzacji. Zaloguj się ponownie";
    }

    if (errorDetails.status === 400) {
      if (errorDetails.code === "INVALID_EMAIL") {
        return "Podaj poprawny adres email";
      }
      return errorDetails.error || "Sprawdź poprawność danych formularza";
    }

    if (errorDetails.status === 500 && errorDetails.code === "PATIENT_CREATE_FAILED") {
      return "Konto użytkownika zostało utworzone, ale rekord pacjenta nie został poprawnie powiązany. Skontaktuj się z administratorem.";
    }

    return errorDetails.error || "Nie udało się utworzyć konta pacjenta";
  };

  const tryRecoverFromPartialSuccess = async (payload: {
    firstName: string;
    lastName: string;
  }): Promise<boolean> => {
    const firstName = payload.firstName.trim();
    const lastName = payload.lastName.trim();

    if (!firstName || !lastName) {
      return false;
    }

    const { data: candidateProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("first_name", firstName)
      .ilike("last_name", lastName)
      .limit(20);

    if (profileError || !candidateProfiles?.length) {
      return false;
    }

    const userIds = candidateProfiles.map((profile) => profile.user_id);

    const { data: matchingPatients, error: patientError } = await supabase
      .from("patients")
      .select("id, user_id")
      .in("user_id", userIds)
      .limit(1);

    return !patientError && Boolean(matchingPatients?.length);
  };

  const shouldAttemptRecovery = (error: any, details: ApiErrorPayload & { status?: number }): boolean => {
    if (details.status === 500 || details.code === "INTERNAL_ERROR") {
      return true;
    }

    const errorName = String(error?.name || "");
    const errorMessage = String(error?.message || "").toLowerCase();

    return errorName === "FunctionsHttpError" || errorMessage.includes("non-2xx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
    };

    if (!payload.email || !EMAIL_REGEX.test(payload.email)) {
      toast.error("Podaj poprawny adres email");
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function to create patient account
      const { data, error } = await supabase.functions.invoke("admin-create-patient", {
        body: payload,
      });

      if (error) throw error;

      await onSuccess();

      const patientId = typeof data?.patientId === "string" ? data.patientId : "";
      if (patientId) {
        const { data: patientRow, error: patientVerifyError } = await supabase
          .from("patients")
          .select("id")
          .eq("id", patientId)
          .maybeSingle();

        if (patientVerifyError || !patientRow?.id) {
          throw new Error("Konto utworzone, ale nie pojawiło się na liście pacjentów.");
        }
      }

      toast.success("Konto pacjenta zostało utworzone i dodane do listy");
      setFormData({ firstName: "", lastName: "", email: "", phone: "" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("[CreatePatientDialog] Error:", error);
      const details = await parseFunctionError(error);

      if (shouldAttemptRecovery(error, details)) {
        const createdAnyway = await tryRecoverFromPartialSuccess(payload);
        if (createdAnyway) {
          await onSuccess();
          toast.success("Konto pacjenta zostało utworzone i dodane do listy");
          setFormData({ firstName: "", lastName: "", email: "", phone: "" });
          onOpenChange(false);
          return;
        }
      }

      toast.error(mapApiErrorToMessage(details));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Utwórz konto pacjenta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Jan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Kowalski"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jan@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Numer telefonu (opcjonalnie)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+48 123 456 789"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Tworzenie..." : "Utwórz konto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePatientDialog;
