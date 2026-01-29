import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PackageCard from "@/components/PackageCard";
import avatarLogo from "@/assets/avatar-logo.svg";

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
}

const packages: Package[] = [
  {
    id: "jadlospis",
    name: "Jadłospis",
    description:
      "Dedykowany jadłospis na podstawie Twoich wyników badań i preferencji żywieniowych. Otrzymasz szczegółowy plan posiłków.",
    price: 249,
  },
  {
    id: "profilaktyka",
    name: "Profilaktyka",
    description:
      "Kompleksowy pakiet profilaktyczny obejmujący zalecenia zdrowotne i plan działania na podstawie diagnostyki.",
    price: 349,
  },
  {
    id: "aktualizacja",
    name: "Aktualizacja",
    description:
      "Aktualizacja dotychczasowego planu w oparciu o nowe wyniki badań i postępy w realizacji celów zdrowotnych.",
    price: 149,
  },
  {
    id: "pakiet-startowy",
    name: "Pakiet Startowy",
    description:
      "Pełny pakiet dla nowych klientów zawierający diagnostykę, jadłospis i plan profilaktyczny w jednym.",
    price: 549,
  },
];

const STRIPE_CHECKOUT_URL =
  "https://checkout.stripe.com/c/pay/cs_live_b1qs7gNNRii6Lm62BVUZEUueXK7LWF4oWHXWfioM55Zkf1ehdbCwruMxTu#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdkdWxOYHwnPyd1blppbHNgWjA0VGlrUTdCdkc3Sk51NzV2dkRPPFVgN31JMGNPSURcbk5gXzE8T1BQRmZzMEZpVWNkaFYwNWM0clJobHdcd0ZrM1VOZ31idWJITmtHU1Z3YGRLXXZxTX9iNTU2dl1SNW5%2FXycpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8naHBpcWxabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl";

const Index = () => {
  const navigate = useNavigate();
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const togglePackage = (id: string) => {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const totalPrice = packages
    .filter((pkg) => selectedPackages.includes(pkg.id))
    .reduce((sum, pkg) => sum + pkg.price, 0);

  const handleBack = () => {
    navigate("/");
  };

  const handleNext = () => {
    window.location.href = STRIPE_CHECKOUT_URL;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        {/* Logo */}
        <div className="mb-8">
          <img
            src={avatarLogo}
            alt="Avatar centrum zdrowia"
            className="h-20 sm:h-24 w-auto"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Wybierz zestaw usług diagnostycznych
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Oferta obejmuje dobór diety w oparciu o diagnostykę oraz kompleksowe
            podejście do Twojego zdrowia i samopoczucia.
          </p>
        </div>

        {/* Package Cards */}
        <div className="w-full max-w-2xl space-y-4 mb-8">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              id={pkg.id}
              name={pkg.name}
              description={pkg.description}
              price={pkg.price}
              isSelected={selectedPackages.includes(pkg.id)}
              onToggle={togglePackage}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Total */}
          <div className="text-center mb-4">
            <span className="text-lg text-muted-foreground">Do zapłaty: </span>
            <span className="text-2xl font-bold text-primary">
              {totalPrice} zł
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="flex-1 h-12 text-base font-medium"
            >
              Powrót
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedPackages.length === 0}
              className="flex-1 h-12 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Dalej
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
