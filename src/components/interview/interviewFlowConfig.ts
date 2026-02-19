import { InterviewV2Content } from "@/types/interviewV2";

export type InterviewQuestionConfig =
  | {
      type: "input" | "textarea" | "date";
      key: keyof InterviewV2Content;
      label: string;
      placeholder?: string;
      helper?: string;
    }
  | {
      type: "select";
      key: keyof InterviewV2Content;
      label: string;
      options: Array<{ value: string; label: string }>;
      placeholder?: string;
    }
  | {
      type: "checkboxGroup";
      key: keyof InterviewV2Content;
      label: string;
      options: Array<{ value: string; label: string }>;
      helper?: string;
    }
  | {
      type: "frequency";
      key: keyof InterviewV2Content;
      label: string;
      helper?: string;
      notePlaceholder?: string;
    };

export type InterviewStepConfig = {
  id: string;
  heading?: string;
  questions: InterviewQuestionConfig[];
};

export const INTERVIEW_STEPS: InterviewStepConfig[] = [
  {
    id: "basic",
    heading: "Dane podstawowe",
    questions: [
      { type: "date", key: "birthDate", label: "Data urodzenia" },
      { type: "input", key: "weight", label: "Waga" },
      { type: "input", key: "height", label: "Wzrost" },
      {
        type: "select",
        key: "sex",
        label: "Płeć",
        placeholder: "Wybierz",
        options: [
          { value: "kobieta", label: "Kobieta" },
          { value: "mężczyzna", label: "Mężczyzna" },
          { value: "inna", label: "Inna" },
        ],
      },
    ],
  },
  {
    id: "symptoms",
    heading: "Dolegliwości",
    questions: [
      {
        type: "textarea",
        key: "mainSymptoms",
        label: "Proszę opisać dolegliwości lub dlaczego chcesz skorzystać z platformy",
      },
      { type: "input", key: "symptomDuration", label: "Od jak dawna występują?" },
      { type: "input", key: "symptomFrequency", label: "Jak często?" },
      { type: "textarea", key: "symptomTriggers", label: "Czy są jakieś okoliczności które je nasilają?" },
    ],
  },
  {
    id: "history",
    heading: "Historia zdrowotna",
    questions: [
      {
        type: "textarea",
        key: "historicalSymptoms",
        label: "Opisz swoje poprzednie historyczne dolegliwości",
      },
      {
        type: "textarea",
        key: "medicationsSupplementsHerbs",
        label: "Przyjmowane leki, suplementy i zioła",
      },
    ],
  },
  {
    id: "fluids",
    heading: "Nawyki dnia",
    questions: [
      {
        type: "textarea",
        key: "dailyFluids",
        label: "Ile Pan/Pani wypija płynów w ciągu dnia? W jakiej formie?",
      },
      {
        type: "textarea",
        key: "bowelMovements",
        label: "Czy wypróżnienia są codziennie? O jakiej porze?",
      },
    ],
  },
  {
    id: "work",
    heading: "Styl życia",
    questions: [
      { type: "input", key: "workType", label: "Rodzaj wykonywanej pracy" },
      { type: "textarea", key: "infectionTendency", label: "Skłonność do infekcji" },
    ],
  },
  {
    id: "meal-pattern",
    heading: "Organizacja posiłków",
    questions: [
      {
        type: "checkboxGroup",
        key: "mealsLocation",
        label: "Gdzie spożywane są najczęściej posiłki?",
        options: [
          { value: "home", label: "W domu" },
          { value: "outside", label: "Poza domem" },
        ],
      },
      { type: "input", key: "mealsPerDay", label: "Ilość spożywanych posiłków w ciągu dnia" },
      {
        type: "textarea",
        key: "snacking",
        label: "Czy podjada Pan/Pani między posiłkami? Jakie produkty?",
      },
    ],
  },
  {
    id: "daily-meals",
    heading: "Struktura posiłków",
    questions: [
      { type: "input", key: "breakfast", label: "Co jest spożywane na śniadanie?" },
      { type: "input", key: "breakfastTime", label: "Pora przyjmowania śniadania" },
      { type: "input", key: "secondBreakfast", label: "Co jest spożywane na drugie śniadanie?" },
      { type: "input", key: "secondBreakfastTime", label: "Pora przyjmowania drugiego śniadania" },
      { type: "input", key: "lunch", label: "Co jest spożywane na obiad?" },
      { type: "input", key: "lunchTime", label: "Pora przyjmowania obiadu?" },
      { type: "input", key: "afternoonSnack", label: "Co jest spożywane na podwieczorek?" },
      { type: "input", key: "afternoonSnackTime", label: "Pora przyjmowania podwieczorku?" },
      { type: "input", key: "dinner", label: "Co jest spożywane na kolację?" },
      { type: "input", key: "dinnerTime", label: "Pora przyjmowania kolacji?" },
    ],
  },
  {
    id: "grains",
    heading: "Produkty zbożowe",
    questions: [
      { type: "frequency", key: "darkBreadFrequency", label: "Jak często spożywane jest ciemne pieczywo?", helper: "Podaj uwagi i kategorie: żytnie, graham, pumpernikiel." },
      { type: "frequency", key: "whiteBreadFrequency", label: "Jak często spożywane jest jasne pieczywo?", helper: "Podaj uwagi i kategorie: pszenne, orkiszowe, ryżowe." },
      { type: "frequency", key: "groatsFrequency", label: "Jak często spożywane są kasze gruboziarniste?", helper: "Podaj uwagi i kategorie: gryczana, jaglana, manna, jęczmienna, bulgur." },
      { type: "frequency", key: "riceFrequency", label: "Jak często spożywany jest ryż?", helper: "Podaj uwagi i kategorie: biały, basmati, brązowy, czarny, czerwony, dziki." },
      { type: "frequency", key: "pastaFrequency", label: "Jak często spożywane są makarony?", helper: "Podaj uwagi i kategorie: pszenne, orkiszowe, żytnie, ryżowe, kukurydziane." },
    ],
  },
  {
    id: "dairy-protein-a",
    heading: "Nabiał i białko - 1",
    questions: [
      { type: "frequency", key: "milkFrequency", label: "Jak często spożywane jest mleko?", helper: "Podaj uwagi i rodzaj: krowie, kozie, roślinne." },
      { type: "frequency", key: "kefirYogurtFrequency", label: "Jak często spożywane są kefir, jogurt, maślanka?" },
      { type: "frequency", key: "yellowCheeseFrequency", label: "Jak często spożywane są sery żółte?", helper: "Podaj uwagi i rodzaj: mozzarella, dojrzewające." },
      { type: "frequency", key: "whiteCheeseFrequency", label: "Jak często spożywane są sery twarogowe białe?" },
      { type: "frequency", key: "moldCheeseFrequency", label: "Jak często spożywane są sery pleśniowe lub topione?" },
    ],
  },
  {
    id: "protein-b",
    heading: "Białko - 2",
    questions: [
      { type: "frequency", key: "eggsFrequency", label: "Jak często spożywane są jaja?" },
      { type: "frequency", key: "whiteMeatFrequency", label: "Jak często spożywane jest mięso białe?", helper: "Podaj uwagi i rodzaj: kurczak, indyk, królik." },
      { type: "frequency", key: "fishSeafoodFrequency", label: "Jak często spożywane są ryby i owoce morza?", helper: "Podaj uwagi i rodzaj." },
      { type: "frequency", key: "redMeatFrequency", label: "Jak często spożywane jest mięso czerwone?", helper: "Podaj uwagi i rodzaj: wieprzowina, wołowina, gęsina." },
      { type: "frequency", key: "coldCutsFrequency", label: "Jak często spożywane są wędliny?", helper: "Podaj uwagi i rodzaj: drobiowe, wieprzowe." },
      { type: "frequency", key: "offalFrequency", label: "Jak często spożywane są podroby mięsne?", helper: "Podaj uwagi i rodzaj: wątróbki, żołądki, flaczki." },
    ],
  },
  {
    id: "fats-plants",
    heading: "Tłuszcze i produkty roślinne",
    questions: [
      { type: "frequency", key: "butterFrequency", label: "Jak często spożywane jest masło?", helper: "Podaj uwagi i podaj kategorie: 82% tłuszczu." },
      { type: "frequency", key: "margarineFrequency", label: "Jak często spożywane są margaryny miękkie?" },
      { type: "frequency", key: "creamFrequency", label: "Jak często spożywana jest śmietana?", helper: "Podaj uwagi i podaj kategorie: 18, 20, 30, 36%." },
      { type: "frequency", key: "plantFatsFrequency", label: "Jak często spożywane są tłuszcze roślinne?", helper: "Podaj uwagi i kategorie: olej kokosowy, oliwa z oliwek, olej lniany." },
      { type: "frequency", key: "animalFatsFrequency", label: "Jak często spożywane są tłuszcze zwierzęce?", helper: "Podaj uwagi i podaj kategorie: smalec gęsi, wieprzowy." },
      { type: "frequency", key: "fruitsFrequency", label: "Jak często spożywane są owoce?", helper: "Podaj uwagi i rodzaj." },
      { type: "frequency", key: "vegetablesFrequency", label: "Jak często spożywane są warzywa? i jakie konkretnie", helper: "Podaj uwagi i rodzaj." },
      { type: "frequency", key: "legumesFrequency", label: "Jak często spożywane są nasiona roślin strączkowych? i jakie konkretnie" },
      { type: "frequency", key: "nutsSeedsFrequency", label: "Jak często spożywane są orzechy i pestki?" },
    ],
  },
  {
    id: "sweet-intolerances",
    heading: "Słodycze i nietolerancje",
    questions: [
      { type: "frequency", key: "honeyFrequency", label: "Jak często spożywany jest miód?" },
      { type: "frequency", key: "jamsFrequency", label: "Jak często spożywane są dżemy?" },
      { type: "frequency", key: "sweetsFrequency", label: "Jak często spożywane są słodycze?", helper: "Podaj uwagi i podaj kategorie: ciastka, batony, czekolady." },
      { type: "frequency", key: "saltySnacksFrequency", label: "Jak często spożywane są słone przekąski?", helper: "Podaj uwagi i podaj kategorie: orzeszki ziemne, chipsy, paluszki." },
      { type: "frequency", key: "sugarFrequency", label: "Jak często spożywany jest cukier?" },
      { type: "textarea", key: "intolerancesAllergies", label: "Jakich potraw Pan/Pani nie toleruje? (alergie pokarmowe)" },
      { type: "textarea", key: "flavorEnhancers", label: "Czy używa Pan/Pani kostek rosołowych, vegety i innych " + "polepszaczy" + "?" },
    ],
  },
  {
    id: "summary",
    heading: "Podsumowanie",
    questions: [
      { type: "textarea", key: "addictions", label: "Czy posiada Pan/Pani nałogi? Jakie?" },
      { type: "textarea", key: "petsAtHome", label: "Czy są zwierzęta w domu lub były?" },
      { type: "textarea", key: "cycleRegularity", label: "Czy miesiączki pojawiają się regularnie i jaka jest obecnie faza cyklu?" },
      { type: "textarea", key: "notes", label: "Dodatkowe uwagi" },
    ],
  },
];
