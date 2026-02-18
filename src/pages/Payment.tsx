import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PackageCard from "@/components/PackageCard";
import avatarLogo from "@/assets/avatar-logo.svg";
import { setPaymentDraft, allPackages, paymentGroups, PaymentGroupKey, calcTotals } from "@/lib/paymentFlow";

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
    <div className="min-h-screen bg-primary flex">
      <div className="flex-1 p-8 lg:p-12 xl:p-16 overflow-y-auto">
        <div className="max-w-2xl bg-card rounded-xl shadow-lg p-8">
          <img src={avatarLogo} alt="Avatar centrum zdrowia" className="h-14 mb-8" />

          <p className="text-sm text-muted-foreground mb-1">Step 1/3</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Szczegóły pakietu</h1>
          <p className="text-muted-foreground italic mb-8">{groupConfig.description}</p>

          <div className="space-y-2 mb-8">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                price={pkg.billing === "monthly" ? `${pkg.price},00 PLN / miesiąc` : `${pkg.price},00 PLN`}
                subtitle={pkg.subtitle}
                description={pkg.description}
                isSelected={selectedPackages.includes(pkg.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>

          <Separator className="mb-6" />
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>Powrót</Button>
            <span className="text-foreground font-medium">
              Łączny koszt: <span className="font-bold">{totalCostLabel}</span>
            </span>
            <Button onClick={handleNext} disabled={selectedPackages.length === 0}>Dalej</Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-1/3 bg-muted flex-col items-center justify-center p-8">
        <img src={avatarLogo} alt="Avatar" className="h-24 xl:h-32 mb-8" />
        <p className="text-muted-foreground text-center">Przyszłość diagnostyki</p>
      </div>
    </div>
  );
};

export default Payment;
