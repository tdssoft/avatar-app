import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Strona wywoływana przez admina przy impersonacji.
 * Odczytuje access_token i refresh_token z URL hash,
 * ustawia sesję Supabase i przekierowuje do dashboardu klienta.
 */
const AuthImpersonate = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Logowanie jako wybrany użytkownik...");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setStatus("Błąd: brak tokenów sesji.");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          console.error("[AuthImpersonate] setSession error:", error);
          setStatus("Błąd logowania: " + error.message);
          setTimeout(() => navigate("/login"), 2000);
        } else {
          setStatus("Zalogowano! Przekierowanie...");
          navigate("/dashboard", { replace: true });
        }
      });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
};

export default AuthImpersonate;
