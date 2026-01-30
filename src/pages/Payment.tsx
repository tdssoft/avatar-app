import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PackageCard from "@/components/PackageCard";
import avatarLogo from "@/assets/avatar-logo.svg";

const packages = [
  {
    id: "optimal",
    name: "OPTYMALNY PAKIET STARTOWY",
    price: 370,
    subtitle: "(diagnoza + analiza + raport + zalecenia)",
    description: [
      "pełna analiza kondycji organizmu on line (biorezonans), w tym raport zdrowotnych",
      "Indywidualny plan terapii",
      "wskazówki dietetyczne",
    ],
  },
  {
    id: "mini",
    name: "MINI PAKIET STARTOWY",
    price: 220,
    subtitle: "(analiza/mini-diagnostyka + raport + zalecenia)",
    description: [
      "analiza kondycji organizmu na podstawie wywiadu, załączonych badań lub mini-diagnostyki on line (niedobory, alergie, obciążenia)",
      "Indywidualny plan terapii",
      "wskazówki dietetyczne",
    ],
  },
  {
    id: "update",
    name: "AKTUALIZACJA PLANU ZDROWOTNEGO",
    price: 220,
    subtitle: "(kontrola i korekta zaleceń na podstawie osiągniętych postępów)",
    description: [
      "analiza kondycji organizmu, w tym diagnostyka",
      "kontynuacja planu terapii",
      "wskazówki dietetyczne",
    ],
  },
  {
    id: "menu",
    name: "JADŁOSPIS 7 dniowy",
    price: 170,
    subtitle: undefined,
    description: [],
  },
];

const Payment = () => {
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const navigate = useNavigate();

  const totalCost = packages
    .filter((p) => selectedPackages.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0);

  const handleToggle = (id: string) => {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleNext = () => {
    // TODO: Navigate to Stripe checkout
    console.log("Selected packages:", selectedPackages);
    console.log("Total cost:", totalCost);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left column - Form */}
      <div className="flex-1 p-8 lg:p-12 xl:p-16 overflow-y-auto">
        <div className="max-w-2xl">
          {/* Logo */}
          <img
            src={avatarLogo}
            alt="Avatar centrum zdrowia"
            className="h-14 mb-8"
          />

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Diagnostyka i kuracja jednorazowa
          </h1>

          {/* Description */}
          <p className="text-muted-foreground italic mb-8">
            Wybierz jakie informacje diagnostyka powinna zawierać. Od ilości
            informacji, zależy finalna cena pakietu.
          </p>

          {/* Package list */}
          <div className="space-y-2 mb-8">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                price={`${pkg.price},00 PLN`}
                subtitle={pkg.subtitle}
                description={pkg.description}
                isSelected={selectedPackages.includes(pkg.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>

          {/* Footer */}
          <Separator className="mb-6" />
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground font-medium"
            >
              ← Powrót
            </button>

            <span className="text-foreground font-medium">
              Łączny koszt:{" "}
              <span className="font-bold">{totalCost} zł</span>
            </span>

            <Button
              onClick={handleNext}
              disabled={selectedPackages.length === 0}
              className="px-8"
            >
              Dalej
            </Button>
          </div>
        </div>
      </div>

      {/* Right column - Marketing panel */}
      <div className="hidden lg:flex w-1/3 bg-muted flex-col items-center justify-center p-8">
        <img
          src={avatarLogo}
          alt="Avatar"
          className="h-24 xl:h-32 mb-8"
        />
        <h2 className="text-xl xl:text-2xl font-bold text-foreground mb-4 text-center">
          Przyszłość diagnostyki
        </h2>
        <p className="text-muted-foreground text-center mb-2">
          Zadbaj o swojego AVATARA
        </p>
        <p className="text-muted-foreground text-center">
          Zadbaj o swoje ciało
        </p>
      </div>
    </div>
  );
};

export default Payment;
