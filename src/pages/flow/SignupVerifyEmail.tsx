import { Link, useLocation } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";

const SignupVerifyEmail = () => {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <MailCheck className="h-7 w-7 text-accent" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Zweryfikuj adres e-mail</h1>
          <p className="text-muted-foreground">
            {email
              ? `Wysłaliśmy wiadomość aktywacyjną na ${email}.`
              : "Wysłaliśmy wiadomość aktywacyjną na Twój adres email."}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground text-left">
          Po kliknięciu linku aktywacyjnego wróć do aplikacji i zaloguj się. Jeśli nie widzisz wiadomości,
          sprawdź folder SPAM/Odebrane.
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/login">Przejdź do logowania</Link>
          </Button>
          <Link to="/signup" className="text-sm text-accent hover:underline">
            Wróć do rejestracji
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupVerifyEmail;
