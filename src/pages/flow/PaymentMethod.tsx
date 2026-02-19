import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import avatarLogo from "@/assets/avatar-logo.svg";
import { calcTotals, getPaymentDraft, setPaymentDraft } from "@/lib/paymentFlow";
import SplitLayout from "@/components/layout/SplitLayout";
import PaymentStepper from "@/components/payment/PaymentStepper";
import { ArrowLeft } from "lucide-react";
import PaymentRightPanel from "@/components/payment/PaymentRightPanel";
import { useFlowRouteGuard } from "@/hooks/useFlowRouteGuard";

const PaymentMethod = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: isFlowLoading, redirectTo } = useFlowRouteGuard(location.pathname);
  const draft = useMemo(() => getPaymentDraft(), []);
  const [method, setMethod] = useState<"p24" | "blik" | "card">(draft?.paymentMethod ?? "p24");

  useEffect(() => {
    if (!draft || draft.selectedPackages.length === 0) {
      navigate("/payment", { replace: true });
    }
  }, [draft, navigate]);

  useEffect(() => {
    if (!isFlowLoading && redirectTo && redirectTo !== location.pathname) {
      navigate(redirectTo, { replace: true });
    }
  }, [isFlowLoading, location.pathname, navigate, redirectTo]);

  if (!draft || draft.selectedPackages.length === 0) {
    return null;
  }

  if (!isFlowLoading && redirectTo && redirectTo !== location.pathname) {
    return null;
  }

  const { totalCostLabel } = calcTotals(draft.selectedPackages);

  const handleNext = () => {
    setPaymentDraft({ ...draft, paymentMethod: method });
    navigate("/payment/checkout");
  };

  return (
    <SplitLayout right={<PaymentRightPanel />}>
      <div className="space-y-7">
        <img src={avatarLogo} alt="Avatar" className="h-12" />

        <PaymentStepper step={2} />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Metoda płatności</h1>
          <p className="text-muted-foreground mt-2">Wybierz preferowaną metodę płatności online.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dostępne metody</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as typeof method)} className="space-y-4">
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem id="p24" value="p24" />
                <Label htmlFor="p24">Przelewy24</Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem id="blik" value="blik" />
                <Label htmlFor="blik">BLIK</Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <RadioGroupItem id="card" value="card" />
                <Label htmlFor="card">Karta kredytowa</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(`/payment?group=${draft.group}`)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót
          </button>

          <div className="text-sm text-muted-foreground">
            Łączny koszt: <span className="font-semibold text-foreground">{totalCostLabel}</span>
          </div>

          <Button variant="black" onClick={handleNext}>
            Dalej
          </Button>
        </div>
      </div>
    </SplitLayout>
  );
};

export default PaymentMethod;
