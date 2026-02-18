import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import avatarLogo from "@/assets/avatar-logo.svg";
import { calcTotals, getPaymentDraft } from "@/lib/paymentFlow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import SplitLayout from "@/components/layout/SplitLayout";
import PaymentStepper from "@/components/payment/PaymentStepper";
import { ArrowLeft } from "lucide-react";
import PaymentRightPanel from "@/components/payment/PaymentRightPanel";

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
    <SplitLayout right={<PaymentRightPanel />}>
      <div className="space-y-7">
        <img src={avatarLogo} alt="Avatar" className="h-12" />

        <PaymentStepper step={3} />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Płatność</h1>
          <p className="text-muted-foreground mt-2">
            Kolejny krok to przekierowanie do zewnętrznej bramki płatniczej (Stripe).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Podsumowanie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Metoda:{" "}
              <span className="font-medium text-foreground">{draft.paymentMethod?.toUpperCase() || "P24"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Pakiety: <span className="font-medium text-foreground">{draft.selectedPackages.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Łączny koszt: <span className="font-semibold text-foreground">{totals.totalCostLabel}</span>
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/payment/method")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót
          </button>

          <Button variant="black" onClick={handleCheckout} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Przejdź do płatności
          </Button>
        </div>
      </div>
    </SplitLayout>
  );
};

export default PaymentCheckout;
