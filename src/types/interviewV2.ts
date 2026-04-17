export type FrequencyOption = "daily" | "weekly" | "monthly" | "rarely";

export type FrequencyAnswer = {
  frequency: FrequencyOption | "";
  note: string;
};

export interface InterviewV2Content {
  birthDate: string;
  weight: string;
  height: string;
  sex: string;
  mainSymptoms: string;
  symptomDuration: string;
  symptomFrequency: string;
  symptomTriggers: string;
  historicalSymptoms: string;
  medicationsSupplementsHerbs: string;
  dailyFluids: string;
  bowelMovements: string;
  workType: string;
  infectionTendency: string;
  mealsLocation: string[];
  mealsPerDay: string;
  snacking: string;
  breakfast: string;
  breakfastTime: string;
  secondBreakfast: string;
  secondBreakfastTime: string;
  lunch: string;
  lunchTime: string;
  afternoonSnack: string;
  afternoonSnackTime: string;
  dinner: string;
  dinnerTime: string;
  darkBreadFrequency: FrequencyAnswer;
  whiteBreadFrequency: FrequencyAnswer;
  groatsFrequency: FrequencyAnswer;
  riceFrequency: FrequencyAnswer;
  pastaFrequency: FrequencyAnswer;
  milkFrequency: FrequencyAnswer;
  kefirYogurtFrequency: FrequencyAnswer;
  yellowCheeseFrequency: FrequencyAnswer;
  whiteCheeseFrequency: FrequencyAnswer;
  moldCheeseFrequency: FrequencyAnswer;
  eggsFrequency: FrequencyAnswer;
  whiteMeatFrequency: FrequencyAnswer;
  fishSeafoodFrequency: FrequencyAnswer;
  redMeatFrequency: FrequencyAnswer;
  coldCutsFrequency: FrequencyAnswer;
  offalFrequency: FrequencyAnswer;
  butterFrequency: FrequencyAnswer;
  margarineFrequency: FrequencyAnswer;
  creamFrequency: FrequencyAnswer;
  plantFatsFrequency: FrequencyAnswer;
  animalFatsFrequency: FrequencyAnswer;
  fruitsFrequency: FrequencyAnswer;
  vegetablesFrequency: FrequencyAnswer;
  legumesFrequency: FrequencyAnswer;
  nutsSeedsFrequency: FrequencyAnswer;
  honeyFrequency: FrequencyAnswer;
  jamsFrequency: FrequencyAnswer;
  sweetsFrequency: FrequencyAnswer;
  saltySnacksFrequency: FrequencyAnswer;
  sugarFrequency: FrequencyAnswer;
  intolerancesAllergies: string;
  flavorEnhancers: string;
  addictions: string;
  petsAtHome: string;
  cycleRegularity: string;
  notes: string;
}

export const FREQUENCY_OPTIONS: Array<{ value: FrequencyOption; label: string }> = [
  { value: "daily", label: "Codziennie" },
  { value: "weekly", label: "Raz w tygodniu" },
  { value: "monthly", label: "Raz w miesiącu" },
  { value: "rarely", label: "Rzadziej" },
];

export const createEmptyFrequencyAnswer = (): FrequencyAnswer => ({
  frequency: "",
  note: "",
});

export const FREQUENCY_FIELD_KEYS: Array<keyof InterviewV2Content> = [
  "darkBreadFrequency",
  "whiteBreadFrequency",
  "groatsFrequency",
  "riceFrequency",
  "pastaFrequency",
  "milkFrequency",
  "kefirYogurtFrequency",
  "yellowCheeseFrequency",
  "whiteCheeseFrequency",
  "moldCheeseFrequency",
  "eggsFrequency",
  "whiteMeatFrequency",
  "fishSeafoodFrequency",
  "redMeatFrequency",
  "coldCutsFrequency",
  "offalFrequency",
  "butterFrequency",
  "margarineFrequency",
  "creamFrequency",
  "plantFatsFrequency",
  "animalFatsFrequency",
  "fruitsFrequency",
  "vegetablesFrequency",
  "legumesFrequency",
  "nutsSeedsFrequency",
  "honeyFrequency",
  "jamsFrequency",
  "sweetsFrequency",
  "saltySnacksFrequency",
  "sugarFrequency",
];

export const EMPTY_INTERVIEW_V2: InterviewV2Content = {
  birthDate: "",
  weight: "",
  height: "",
  sex: "",
  mainSymptoms: "",
  symptomDuration: "",
  symptomFrequency: "",
  symptomTriggers: "",
  historicalSymptoms: "",
  medicationsSupplementsHerbs: "",
  dailyFluids: "",
  bowelMovements: "",
  workType: "",
  infectionTendency: "",
  mealsLocation: [],
  mealsPerDay: "",
  snacking: "",
  breakfast: "",
  breakfastTime: "",
  secondBreakfast: "",
  secondBreakfastTime: "",
  lunch: "",
  lunchTime: "",
  afternoonSnack: "",
  afternoonSnackTime: "",
  dinner: "",
  dinnerTime: "",
  darkBreadFrequency: createEmptyFrequencyAnswer(),
  whiteBreadFrequency: createEmptyFrequencyAnswer(),
  groatsFrequency: createEmptyFrequencyAnswer(),
  riceFrequency: createEmptyFrequencyAnswer(),
  pastaFrequency: createEmptyFrequencyAnswer(),
  milkFrequency: createEmptyFrequencyAnswer(),
  kefirYogurtFrequency: createEmptyFrequencyAnswer(),
  yellowCheeseFrequency: createEmptyFrequencyAnswer(),
  whiteCheeseFrequency: createEmptyFrequencyAnswer(),
  moldCheeseFrequency: createEmptyFrequencyAnswer(),
  eggsFrequency: createEmptyFrequencyAnswer(),
  whiteMeatFrequency: createEmptyFrequencyAnswer(),
  fishSeafoodFrequency: createEmptyFrequencyAnswer(),
  redMeatFrequency: createEmptyFrequencyAnswer(),
  coldCutsFrequency: createEmptyFrequencyAnswer(),
  offalFrequency: createEmptyFrequencyAnswer(),
  butterFrequency: createEmptyFrequencyAnswer(),
  margarineFrequency: createEmptyFrequencyAnswer(),
  creamFrequency: createEmptyFrequencyAnswer(),
  plantFatsFrequency: createEmptyFrequencyAnswer(),
  animalFatsFrequency: createEmptyFrequencyAnswer(),
  fruitsFrequency: createEmptyFrequencyAnswer(),
  vegetablesFrequency: createEmptyFrequencyAnswer(),
  legumesFrequency: createEmptyFrequencyAnswer(),
  nutsSeedsFrequency: createEmptyFrequencyAnswer(),
  honeyFrequency: createEmptyFrequencyAnswer(),
  jamsFrequency: createEmptyFrequencyAnswer(),
  sweetsFrequency: createEmptyFrequencyAnswer(),
  saltySnacksFrequency: createEmptyFrequencyAnswer(),
  sugarFrequency: createEmptyFrequencyAnswer(),
  intolerancesAllergies: "",
  flavorEnhancers: "",
  addictions: "",
  petsAtHome: "",
  cycleRegularity: "",
  notes: "",
};

const LEGACY_FREQUENCY_MAP: Record<string, FrequencyOption> = {
  codziennie: "daily",
  "raz w tygodniu": "weekly",
  "raz w miesiacu": "monthly",
  "raz w miesiącu": "monthly",
  rzadziej: "rarely",
};

const isFrequencyAnswerObject = (value: unknown): value is FrequencyAnswer => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as FrequencyAnswer;
  return typeof candidate.frequency === "string" && typeof candidate.note === "string";
};

export const normalizeFrequencyAnswer = (value: unknown): FrequencyAnswer => {
  if (!value) return createEmptyFrequencyAnswer();

  if (typeof value === "string") {
    const normalized = LEGACY_FREQUENCY_MAP[value.trim().toLowerCase()];
    if (normalized) {
      return { frequency: normalized, note: "" };
    }
    return { frequency: "", note: value };
  }

  if (isFrequencyAnswerObject(value)) {
    const normalized = value.frequency ? LEGACY_FREQUENCY_MAP[value.frequency.toLowerCase()] || value.frequency : "";
    return {
      frequency: (normalized as FrequencyOption | "") || "",
      note: value.note || "",
    };
  }

  return createEmptyFrequencyAnswer();
};

export const normalizeInterviewContent = (raw: unknown): InterviewV2Content => {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<InterviewV2Content>;

  const next: InterviewV2Content = {
    ...EMPTY_INTERVIEW_V2,
    ...source,
    mealsLocation: Array.isArray(source.mealsLocation)
      ? source.mealsLocation.filter((item): item is string => typeof item === "string")
      : EMPTY_INTERVIEW_V2.mealsLocation,
  };

  for (const key of FREQUENCY_FIELD_KEYS) {
    next[key] = normalizeFrequencyAnswer(source[key]);
  }

  return next;
};

export const formatFrequencyAnswer = (value: unknown): string => {
  const normalized = normalizeFrequencyAnswer(value);
  const label = FREQUENCY_OPTIONS.find((option) => option.value === normalized.frequency)?.label ?? "";

  if (label && normalized.note) return `${label} - ${normalized.note}`;
  if (label) return label;
  return normalized.note;
};
