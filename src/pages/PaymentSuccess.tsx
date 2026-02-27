import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import avatarLogo from "@/assets/avatar-logo.svg";
import { clearPaymentDraft } from "@/lib/paymentFlow";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { hasPaidPlanForActiveProfile, isLoading, refresh } = useUserFlowStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollingFinished, setPollingFinished] = useState(false);

  useEffect(() => {
    clearPaymentDraft();
  }, []);

  useEffect(() => {
    if (hasPaidPlanForActiveProfile) {
      navigate("/interview", { replace: true });
    }
  }, [hasPaidPlanForActiveProfile, navigate]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 24;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      await refresh();
      if (attempts >= maxAttempts && !cancelled) {
        setPollingFinished(true);
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, 2500);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <img
            src={avatarLogo}
            alt="Avatar centrum zdrowia"
            className="h-12 mx-auto mb-6"
          />

          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-accent" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Płatność zakończona pomyślnie!
          </h1>
          <p className="text-muted-foreground mb-6">
            Dziękujemy za zakup. Twoje zamówienie zostało przyjęte do realizacji.
            Wkrótce otrzymasz potwierdzenie na adres email.
          </p>

          <div className="space-y-3">
            <Button onClick={() => navigate("/interview")} className="w-full">
              Przejdź do wywiadu
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              className="w-full"
              disabled={isRefreshing || isLoading}
            >
              {(isRefreshing || isLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Odśwież status
            </Button>
            {!hasPaidPlanForActiveProfile && !isLoading && !pollingFinished && (
              <p className="text-xs text-muted-foreground">Sprawdzam status płatności automatycznie...</p>
            )}
            {!hasPaidPlanForActiveProfile && pollingFinished && (
              <p className="text-xs text-muted-foreground">
                Weryfikacja trwa dłużej niż zwykle. Kliknij „Odśwież status” za chwilę.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
