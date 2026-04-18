import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, Copy, ExternalLink, Mail, MailX } from "lucide-react";

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
}

type ApiErrorPayload = {
  error?: string;
  code?: string;
};

interface CreatedAccount {
  email: string;
  firstName: string;
  lastName: string;
  emailSent: boolean;
  setupLink: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CreatePatientDialog = ({ open, onOpenChange, onSuccess }: CreatePatientDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
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

      // Plan B: show success screen with setup link
      const account: CreatedAccount = {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        emailSent: Boolean(data?.emailSent),
        setupLink: typeof data?.setupLink === "string" ? data.setupLink : "",
      };
      setCreatedAccount(account);
      setFormData({ firstName: "", lastName: "", email: "", phone: "" });

      // Plan C: auto-open setup link in new tab
      if (account.setupLink) {
        window.open(account.setupLink, "_blank");
      }
    } catch (error: any) {
      console.error("[CreatePatientDialog] Error:", error);
      const details = await parseFunctionError(error);
      toast.error(mapApiErrorToMessage(details));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedAccount(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    if (!createdAccount?.setupLink) return;
    try {
      await navigator.clipboard.writeText(createdAccount.setupLink);
      toast.success("Link skopiowany do schowka");
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {createdAccount ? (
          // Success screen (Plan B)
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Konto zostało utworzone
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {createdAccount.firstName} {createdAccount.lastName}
                </span>{" "}
                · {createdAccount.email}
              </p>

              {/* Email status */}
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  createdAccount.emailSent
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {createdAccount.emailSent ? (
                  <>
                    <Mail className="h-4 w-4 shrink-0" />
                    Email z linkiem wysłany — sprawdź skrzynkę (może być w spamie)
                  </>
                ) : (
                  <>
                    <MailX className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Email nie wysłany.</strong> Użyj linku poniżej aby ustawić hasło.
                    </span>
                  </>
                )}
              </div>

              {/* Setup link */}
              {createdAccount.setupLink ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Link do ustawienia hasła
                  </p>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <span className="flex-1 truncate text-xs font-mono text-muted-foreground">
                      {createdAccount.setupLink}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleCopyLink}
                      title="Kopiuj link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Link ważny 24h. Strona ustawienia hasła powinna otworzyć się automatycznie w nowej karcie.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Nie udało się wygenerować linku. Wyślij ręczny reset hasła z Supabase.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              {createdAccount.setupLink && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(createdAccount.setupLink, "_blank")}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Otwórz stronę ustawienia hasła
                </Button>
              )}
              <Button type="button" onClick={handleClose}>
                Zamknij
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Create form
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreatePatientDialog;
