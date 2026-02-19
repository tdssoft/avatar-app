import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PackageCard from "@/components/PackageCard";
import avatarLogo from "@/assets/avatar-logo.svg";
import { setPaymentDraft, allPackages, paymentGroups, PaymentGroupKey, calcTotals } from "@/lib/paymentFlow";
import SplitLayout from "@/components/layout/SplitLayout";
import PaymentStepper from "@/components/payment/PaymentStepper";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PaymentRightPanel from "@/components/payment/PaymentRightPanel";

const Payment = () => {
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const groupParam = searchParams.get("group");
  const activeGroup: PaymentGroupKey = groupParam === "regen" ? "regen" : "avatar";
  const groupConfig = paymentGroups[activeGroup];

  const packages = useMemo(
    () => allPackages.filter((pkg) => groupConfig.packageIds.includes(pkg.id)),
    [groupConfig.packageIds],
  );

  const { totalCostLabel } = calcTotals(selectedPackages);

  const handleToggle = (id: string) => {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleNext = () => {
    if (selectedPackages.length === 0) return;
    setPaymentDraft({
      group: activeGroup,
      selectedPackages,
      paymentMethod: "p24",
    });
    navigate("/payment/method");
  };

  return (
    <SplitLayout right={<PaymentRightPanel />}>
      <div className="space-y-7">
        <img src={avatarLogo} alt="Avatar centrum zdrowia" className="h-12" />

        <PaymentStepper step={1} />

        <div>
          <h1 className="text-2xl font-bold text-foreground">{groupConfig.title}</h1>
          <p className="text-muted-foreground italic mt-2">
            {groupConfig.description}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Szczegóły pakietu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Wybierz jakie informacje diagnostyka powinna zawierać. Od ilości informacji zależy finalna cena pakietu.
            </p>
            <div className="pt-2">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  id={pkg.id}
                  name={pkg.name}
                  price={pkg.billing === "monthly" ? `${pkg.price} zł / miesiąc` : `${pkg.price} zł`}
                  subtitle={pkg.subtitle}
                  description={pkg.description}
                  isSelected={selectedPackages.includes(pkg.id)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót
          </button>

          <span className="text-sm text-muted-foreground">
            Łączny koszt: <span className="font-semibold text-foreground">{totalCostLabel}</span>
          </span>

          <Button variant="black" onClick={handleNext} disabled={selectedPackages.length === 0}>
            Dalej
          </Button>
        </div>
      </div>
    </SplitLayout>
  );
};

export default Payment;
