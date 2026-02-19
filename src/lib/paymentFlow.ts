export type BillingType = "one_time" | "monthly";

export type PackageDefinition = {
  id: string;
  name: string;
  price: number;
  billing: BillingType;
  subtitle?: string;
  description: string[];
};

export const PAYMENT_DRAFT_KEY = "avatar_payment_draft";

export const allPackages: PackageDefinition[] = [
  {
    id: "optimal",
    name: "Pełny Program Startowy",
    price: 370,
    billing: "one_time",
    description: [
      "pełna analiza biorezonansowa kondycji organizmu",
      "indywidualnie opracowany plan kuracji",
      "dopasowane wskazówki dietetyczne",
    ],
  },
  {
    id: "mini",
    name: "Mini Program Startowy",
    price: 220,
    billing: "one_time",
    description: [
      "ocena kondycji organizmu na podstawie: wywiadu zdrowotnego, wyników badań, mini analizy online (niedobory, alergie, obciążenia)",
      "indywidualnie opracowany plan kuracji",
      "dopasowane wskazówki dietetyczne",
    ],
  },
  {
    id: "update",
    name: "Kontynuacja Programu Zdrowotnego",
    price: 220,
    billing: "one_time",
    description: [
      "bieżąca analiza biorezonansowa",
      "kontynuacja indywidualnego planu kuracji",
      "dopasowane wskazówki dietetyczne",
    ],
  },
  {
    id: "menu",
    name: "Jadłospis 7-dniowy",
    price: 170,
    billing: "one_time",
    description: [
      "spersonalizowany jadłospis na 7 dni",
    ],
  },
  {
    id: "autopilot",
    name: "Autopilot Zdrowia - program stałego wsparcia",
    price: 27,
    billing: "monthly",
    description: [
      "wytyczne dietetyczne z elementami kuracji",
      "program profilaktyczny odnoszący się do zgłoszonych dolegliwości",
    ],
  },
];

export const paymentGroups = {
  avatar: {
    title: "Indywidualny program wsparcia ciała AVATAR",
    description: "Wybierz pakiety dopasowane do potrzeb Twojego organizmu.",
    packageIds: ["optimal", "mini", "update"],
  },
  regen: {
    title: "Regeneracyjny program organizmu",
    description: "Wybierz pakiety regeneracyjne dopasowane do Twoich potrzeb.",
    packageIds: ["menu", "autopilot"],
  },
} as const;

export type PaymentGroupKey = keyof typeof paymentGroups;

export type PaymentDraft = {
  group: PaymentGroupKey;
  selectedPackages: string[];
  paymentMethod?: "p24" | "blik" | "card";
};

export const getPaymentDraft = (): PaymentDraft | null => {
  try {
    const raw = sessionStorage.getItem(PAYMENT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PaymentDraft;
  } catch {
    return null;
  }
};

export const setPaymentDraft = (draft: PaymentDraft) => {
  sessionStorage.setItem(PAYMENT_DRAFT_KEY, JSON.stringify(draft));
};

export const clearPaymentDraft = () => {
  sessionStorage.removeItem(PAYMENT_DRAFT_KEY);
};

export const calcTotals = (selectedPackages: string[]) => {
  const selected = allPackages.filter((pkg) => selectedPackages.includes(pkg.id));
  const oneTimeCost = selected
    .filter((p) => p.billing === "one_time")
    .reduce((sum, p) => sum + p.price, 0);
  const monthlyCost = selected
    .filter((p) => p.billing === "monthly")
    .reduce((sum, p) => sum + p.price, 0);

  const totalCostLabel = monthlyCost > 0 && oneTimeCost > 0
    ? `${oneTimeCost} zł teraz + ${monthlyCost} zł / miesiąc`
    : monthlyCost > 0
      ? `${monthlyCost} zł / miesiąc`
      : `${oneTimeCost} zł`;

  return { oneTimeCost, monthlyCost, totalCostLabel };
};
