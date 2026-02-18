import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import avatarLogo from "@/assets/avatar-logo.svg";
import { calcTotals, getPaymentDraft, setPaymentDraft } from "@/lib/paymentFlow";

const PaymentMethod = () => {
  const navigate = useNavigate();
  const draft = useMemo(() => getPaymentDraft(), []);
  const [method, setMethod] = useState<"p24" | "blik" | "card">(draft?.paymentMethod ?? "p24");

  useEffect(() => {
    if (!draft || draft.selectedPackages.length === 0) {
      navigate("/payment", { replace: true });
    }
  }, [draft, navigate]);

  if (!draft || draft.selectedPackages.length === 0) {
    return null;
  }

  const { totalCostLabel } = calcTotals(draft.selectedPackages);

  const handleNext = () => {
    setPaymentDraft({ ...draft, paymentMethod: method });
    navigate("/payment/checkout");
  };

  return (
    <div className="min-h-screen bg-primary flex">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-2xl bg-card rounded-xl shadow-lg p-8 space-y-8">
          <img src={avatarLogo} alt="Avatar" className="h-14" />

          <div>
            <p className="text-sm text-muted-foreground">Step 2/3</p>
            <h1 className="text-2xl font-bold text-foreground">Metoda płatności</h1>
            <p className="text-muted-foreground">Wybierz preferowaną metodę płatności online.</p>
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

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/payment")}>Powrót</Button>
            <div className="text-sm text-muted-foreground">Łączny koszt: <span className="font-semibold text-foreground">{totalCostLabel}</span></div>
            <Button onClick={handleNext}>Dalej</Button>
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

export default PaymentMethod;
