import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import avatarLogo from "@/assets/avatar-logo.svg";
import { calcTotals, getPaymentDraft } from "@/lib/paymentFlow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const PaymentCheckout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const draft = useMemo(() => getPaymentDraft(), []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!draft || draft.selectedPackages.length === 0) {
      navigate("/payment", { replace: true });
    }
  }, [draft, navigate]);

  if (!draft || draft.selectedPackages.length === 0) {
    return null;
  }

  const totals = calcTotals(draft.selectedPackages);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          packages: draft.selectedPackages,
          origin: window.location.origin,
          payment_method: draft.paymentMethod,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Nie udało się pobrać URL płatności");

      window.location.href = data.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się rozpocząć płatności";
      toast({
        variant: "destructive",
        title: "Błąd płatności",
        description: message,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-2xl bg-card rounded-xl shadow-lg p-8 space-y-8">
          <img src={avatarLogo} alt="Avatar" className="h-14" />

          <div>
            <p className="text-sm text-muted-foreground">Step 3/3</p>
            <h1 className="text-2xl font-bold text-foreground">Płatność</h1>
            <p className="text-muted-foreground">Kolejny krok to przekierowanie do zewnętrznej bramki płatniczej (Stripe).</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Podsumowanie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Metoda: <span className="font-medium text-foreground">{draft.paymentMethod?.toUpperCase() || "P24"}</span></p>
              <p className="text-sm text-muted-foreground">Pakiety: <span className="font-medium text-foreground">{draft.selectedPackages.length}</span></p>
              <p className="text-sm text-muted-foreground">Łączny koszt: <span className="font-semibold text-foreground">{totals.totalCostLabel}</span></p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/payment/method")}>Powrót</Button>
            <Button onClick={handleCheckout} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Przejdź do płatności
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-1/3 bg-muted flex-col items-center justify-center p-8">
        <img src={avatarLogo} alt="Avatar" className="h-24 mb-6" />
        <p className="text-muted-foreground text-center">Przyszłość diagnostyki</p>
      </div>
    </div>
  );
};

export default PaymentCheckout;
