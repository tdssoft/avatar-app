import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const parseAuthParams = () => {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    code: search.get("code"),
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    type: hash.get("type") ?? search.get("type"),
    errorCode: hash.get("error_code") ?? search.get("error_code"),
    errorDescription:
      hash.get("error_description") ??
      search.get("error_description") ??
      hash.get("error") ??
      search.get("error"),
  };
};

const mapErrorToMessage = (errorCode: string | null, errorDescription: string | null): string => {
  if (errorCode === "otp_expired") {
    return "Link wygasł lub jest nieprawidłowy. Użyj kodu jednorazowego z maila.";
  }
  if (errorDescription) {
    return decodeURIComponent(errorDescription.replace(/\+/g, " "));
  }
  return "Nie udało się zweryfikować linku resetu hasła. Użyj kodu jednorazowego z maila.";
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [didInit, setDidInit] = useState(false);

  const authParams = useMemo(() => parseAuthParams(), []);
  const hasRecoverySignals = Boolean(
    authParams.type === "recovery" || authParams.code || authParams.accessToken || authParams.errorCode,
  );

  useEffect(() => {
    const initializeRecovery = async () => {
      if (authParams.errorCode || authParams.errorDescription) {
        setVerificationError(mapErrorToMessage(authParams.errorCode, authParams.errorDescription));
      }

      try {
        if (authParams.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(authParams.code);
          if (error) throw error;
        } else if (authParams.accessToken && authParams.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: authParams.accessToken,
            refresh_token: authParams.refreshToken,
          });
          if (error) throw error;
        }
      } catch (error) {
        console.error("[ResetPassword] recovery init error:", error);
        setVerificationError("Link wygasł lub jest nieprawidłowy. Użyj kodu jednorazowego z maila.");
      }

      const { data } = await supabase.auth.getSession();
      setHasRecoverySession(Boolean(data.session));
      setDidInit(true);
    };

    void initializeRecovery();
  }, [authParams.accessToken, authParams.code, authParams.errorCode, authParams.errorDescription, authParams.refreshToken]);

  const validatePassword = (): boolean => {
    if (newPassword.length < 6) {
      toast.error("Hasło musi mieć minimum 6 znaków.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Hasła nie są identyczne.");
      return false;
    }
    return true;
  };

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Hasło zostało zmienione. Zaloguj się nowym hasłem.");
      navigate("/login");
    } catch (error) {
      console.error("[ResetPassword] update password error:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się zmienić hasła.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpFallback = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;
    if (!email.trim() || !otpCode.trim()) {
      toast.error("Podaj email i kod jednorazowy.");
      return;
    }

    setIsOtpSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "recovery",
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast.success("Hasło zostało zmienione. Zaloguj się nowym hasłem.");
      navigate("/login");
    } catch (error) {
      console.error("[ResetPassword] otp fallback error:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się użyć kodu jednorazowego.");
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const shouldShowLoggedInGuard = didInit && session && !hasRecoverySignals && !hasRecoverySession;

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Ustaw nowe hasło</h1>
          <p className="text-muted-foreground">
            Wpisz nowe hasło dla swojego konta. Jeśli link nie działa, użyj kodu jednorazowego z maila.
          </p>
        </div>

        {verificationError ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {verificationError}
          </div>
        ) : null}

        {shouldShowLoggedInGuard ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Jesteś już zalogowany. Przejdź do <Link to="/dashboard" className="text-accent hover:underline">dashboardu</Link>.
          </div>
        ) : (
          <>
            <form onSubmit={handlePasswordReset} className="space-y-4 border rounded-lg p-4">
              <h2 className="font-semibold text-foreground">Reset przez link</h2>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nowe hasło</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 znaków"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Powtórz nowe hasło"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || !didInit}>
                {isSubmitting ? "Zapisywanie..." : "Ustaw nowe hasło"}
              </Button>
            </form>

            <form onSubmit={handleOtpFallback} className="space-y-4 border rounded-lg p-4">
              <h2 className="font-semibold text-foreground">Link nie działa? Użyj kodu jednorazowego</h2>
              <div className="space-y-2">
                <Label htmlFor="otpEmail">Email</Label>
                <Input
                  id="otpEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Twój adres email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otpCode">Kod jednorazowy</Label>
                <Input
                  id="otpCode"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Wpisz kod z maila"
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={isOtpSubmitting}>
                {isOtpSubmitting ? "Weryfikacja..." : "Zweryfikuj kod i ustaw hasło"}
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;

