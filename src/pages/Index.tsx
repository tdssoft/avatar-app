import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogIn } from "lucide-react";
import PackageCard from "@/components/PackageCard";
import avatarLogo from "@/assets/avatar-logo.svg";

interface Package {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  subtitle?: string;
  description?: string[];
}

const packages: Package[] = [
  {
    id: "optymalny-pakiet",
    name: "OPTYMALNY PAKIET STARTOWY",
    price: "370,00 PLN",
    priceValue: 370,
    subtitle: "( diagnoza + analiza + raport + zalecenia)",
    description: [
      "pełna analiza kondycji organizmu on line (biorezonans), w tym raport zdrowotnych",
      "Indywidualny plan terapii",
      "wskazówki dietetyczne",
    ],
  },
  {
    id: "mini-pakiet",
    name: "MINI PAKIET STARTOWY",
    price: "220,00 PLN",
    priceValue: 220,
    subtitle: "(analiza/mini-diagnostyka + raport + zalecenia)",
    description: [
      "analiza kondycji organizmu na podstawie wywiadu, załączonych badań lub mini-diagnostyki on line (niedobory, alergie, obciążenia)",
      "Indywidualny plan terapii",
      "wskazówki dietetyczne",
    ],
  },
  {
    id: "aktualizacja",
    name: "AKTUALIZACJA PLANU ZDROWOTNEGO",
    price: "220,00 PLN",
    priceValue: 220,
    subtitle: "(kontrola i korekta zaleceń na podstawie osiągniętych postępów)",
    description: [
      "analiza kondycji organizmu, w tym diagnostyka",
      "kontynuacja planu terapii",
      "wskazówki dietetyczne",
    ],
  },
  {
    id: "jadlospis",
    name: "JADŁOSPIS 7 dniowy",
    price: "170,00 PLN",
    priceValue: 170,
  },
  {
    id: "profilaktyka",
    name: "PROFILAKTYKA",
    price: "27,00 PLN / miesiąc",
    priceValue: 27,
    description: [
      "wytyczne dietetyczne z elementami terapii",
      "program profilaktyczny odnoszący się do zgłoszonych potrzeb/problemów",
    ],
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
    .reduce((sum, pkg) => sum + pkg.priceValue, 0);

  const handleBack = () => {
    navigate("/");
  };

  const handleNext = () => {
    window.location.href = STRIPE_CHECKOUT_URL;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left Card - Main Content */}
          <div className="bg-card rounded-2xl shadow-sm p-8 md:p-12">
            {/* Logo and Login Link */}
            <div className="flex items-center justify-between mb-10">
              <img
                src={avatarLogo}
                alt="Avatar centrum zdrowia"
                className="h-12 w-auto"
              />
              <Link 
                to="/login" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Zaloguj się
              </Link>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-[1.7rem] font-bold text-foreground mb-3">
                Diagnostyka i kuracja jednorazowa
              </h1>
              <p className="text-muted-foreground text-sm md:text-base italic">
                Wybierz jakie informacje diagnostyka powinna zawierać. Od ilości informacji, zależy finalna cena pakietu.
              </p>
            </div>

            {/* Package Options */}
            <div className="space-y-4 mb-10">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  id={pkg.id}
                  name={pkg.name}
                  price={pkg.price}
                  subtitle={pkg.subtitle}
                  description={pkg.description}
                  isSelected={selectedPackages.includes(pkg.id)}
                  onToggle={togglePackage}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-foreground mb-6" />

            {/* Total */}
            <div className="mb-8">
              <span className="text-muted-foreground text-base">Łączny koszt: </span>
              <span className="text-2xl font-bold text-foreground ml-2">
                {totalPrice} zł
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-foreground hover:text-foreground/70 transition-colors font-medium"
              >
                <ArrowLeft className="h-5 w-5" />
                Powrót
              </button>
              <Button
                onClick={handleNext}
                disabled={selectedPackages.length === 0}
                className="px-8 h-11 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
              >
                Dalej
              </Button>
            </div>
          </div>

          {/* Right Card - Sidebar */}
          <div className="bg-secondary rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center text-center min-h-[400px] lg:min-h-0">
            {/* Logo */}
            <div className="mb-8">
              <img
                src={avatarLogo}
                alt="Avatar centrum zdrowia"
                className="h-20 w-auto"
              />
            </div>

            {/* Tagline */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Przyszłość diagnostyki
              </h2>
              <p className="text-foreground/80 text-sm leading-relaxed">
                Zadbaj o swojego AVATARA
                <br />
                Zadbaj o swoje ciało
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
