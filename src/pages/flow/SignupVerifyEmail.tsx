import { useState } from "react";
import { useLocation } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SignupVerifyEmail = () => {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setIsSending(true);
    try {
      // supabase-js v2 supports resend for signup confirmation emails
      const { error } = await (supabase.auth as any).resend({ type: "signup", email });
      if (error) throw error;
      toast({ title: "Wysłano ponownie", description: "Sprawdź skrzynkę email." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się wysłać wiadomości ponownie.";
      toast({ variant: "destructive", title: "Błąd", description: message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Zweryfikuj adres e-mail</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Wysłaliśmy link aktywacyjny na adres{" "}
            <span className="font-medium text-foreground">{email ?? "Twój adres e-mail"}</span>. Kliknij na link w
            wiadomości aby dokończyć rejestrację.
          </p>
        </div>

        <Button onClick={handleResend} variant="black" className="w-full" disabled={!email || isSending}>
          {isSending ? "Wysyłanie..." : "Wyślij wiadomość ponownie"}
        </Button>
      </div>
    </AuthLayout>
  );
};

export default SignupVerifyEmail;
