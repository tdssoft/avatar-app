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
    }
  | {
      type: "mealPair";
      keyLeft: keyof InterviewV2Content;
      labelLeft: string;
      keyRight: keyof InterviewV2Content;
      labelRight: string;
    };

export type InterviewStepConfig = {
  id: string;
  heading?: string;
  layout?: "two-column";
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
        label: "Opisz swoje dolegliwości/potrzeby od jak dawna występują? Kiedy się nasilają i jak często?",
      },
    ],
  },
  {
    id: "history",
    heading: "Twoja historia zdrowotna",
    questions: [
      {
        type: "textarea",
        key: "historicalSymptoms",
        label: "Opisz swoje wcześniejsze dolegliwości zdrowotne: pobyty w szpitalu, odbyte operacje, choroby dotychczasowe oraz przewlekłe.",
      },
      {
        type: "textarea",
        key: "medicationsSupplementsHerbs",
        label: "Czy obecnie przyjmujesz lub przyjmowałeś/aś w przeszłości leki, suplementy diety lub zioła? Jeśli tak – jakie? Czy masz skłonność do infekcji?",
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
        label: "Ile wypijasz płynów w ciągu dnia? W jakiej formie: woda, herbata, kawa, soki?",
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
          { value: "mix", label: "Mix (w domu i poza domem)" },
        ],
      },
      {
        type: "textarea",
        key: "snacking",
        label: "Czy podjada Pan/Pani pomiędzy posiłkami i jakie produkty?",
      },
    ],
  },
  {
    id: "daily-meals",
    heading: "Struktura posiłków",
    questions: [
      { type: "mealPair", keyLeft: "breakfast", labelLeft: "Co jest spożywane na śniadanie?", keyRight: "breakfastTime", labelRight: "Pora przyjmowania?" },
      { type: "mealPair", keyLeft: "lunch", labelLeft: "Co jest spożywane na obiad?", keyRight: "lunchTime", labelRight: "Pora przyjmowania?" },
      { type: "mealPair", keyLeft: "dinner", labelLeft: "Co jest spożywane na kolację?", keyRight: "dinnerTime", labelRight: "Pora przyjmowania?" },
      { type: "mealPair", keyLeft: "extraMeals", labelLeft: "Czy spożywasz więcej niż 3 posiłki dziennie? Jeśli tak, jakie są to dodatkowe posiłki?", keyRight: "extraMealsTime", labelRight: "Pora przyjmowania?" },
    ],
  },
  {
    id: "grains",
    heading: "Produkty zbożowe",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "darkBreadFrequency",
        label: "Czy spożywasz produkty mączne? Jakie formy?",
        helper: "pszenne, żytnie, graham, pumpernikiel, orkiszowe, ryżowe, z soczewicy, z ciecierzycy, z zielonego groszku — chleb, bułki, makarony, ciastka",
      },
      {
        type: "frequency",
        key: "whiteBreadFrequency",
        label: "Jak często spożywane są kasze i ryż?",
        helper: "gryczane, jaglane, manna, płatki owsiane, jęczmienne, bulgur, kuskus; biały, basmati, brązowy, czarny, czerwony, dziki",
      },
    ],
  },
  {
    id: "dairy-protein-a",
    heading: "Nabiał",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "kefirYogurtFrequency",
        label: "Jak często spożywane są produkty mleczne?",
        helper: "kefiry, jogurty, maślanka, sery żółte, białe, pleśniowe, topione",
      },
      {
        type: "frequency",
        key: "eggsFrequency",
        label: "Jak często spożywane są jaja?",
      },
    ],
  },
  {
    id: "protein-b",
    heading: "Mięso i ryby",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "whiteMeatFrequency",
        label: "Jak często spożywane jest mięso: białe, czerwone?",
        helper: "kurczak, indyk, wołowina, wieprzowina, kaczka, gęsina, baranina, królik",
      },
      {
        type: "frequency",
        key: "fishSeafoodFrequency",
        label: "Jak często spożywane są ryby i owoce morza?",
        helper: "łosoś, halibut, tuńczyk, makrela, śledź, węgorz, szprot, sardynka, karp, pstrąg, karmazyn, lin, sola, dorsz, morszczuk, sandacz, tilapia, szczupak, mintaj, kergulena, miruna, panga, płoć, leszcz, płastuga, dorada, flądra",
      },
      {
        type: "frequency",
        key: "coldCutsFrequency",
        label: "Jak często spożywane są podroby mięsne, wędliny?",
        helper: "pasztety, drobiowe, wątróbki, żołądki, flaczki",
      },
      {
        type: "frequency",
        key: "butterFrequency",
        label: "Jak często spożywane są tłuszcze zwierzęce: masło, smalec, margaryna, śmietana, smalec?",
        helper: "ilość % tłuszczu: 82, 18, 20, 30, 36",
      },
      {
        type: "frequency",
        key: "plantFatsFrequency",
        label: "Jak często spożywane są tłuszcze roślinne?",
        helper: "olej kokosowy, olej lniany, olej z czarnuszki, oliwa z oliwek, olej słonecznikowy, olej rzepakowy, olej z wiesiołka",
      },
    ],
  },
  {
    id: "fats-plants",
    heading: "Owoce, warzywa i rośliny",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "fruitsFrequency",
        label: "Jak często spożywane są owoce i jakie konkretnie?",
        helper: "brzoskwinia, nektarynka, gruszka, morela, morwa, śliwa, wiśnia, czereśnia, cytryna, grejpfrut, mandarynka, pomarańcza, figa, granat, mango, kiwi, daktyle, kokos, awokado, agrest, aronia, borówka amerykańska, jagoda, kamczacka, malina, pigwa, porzeczka czarna i czerwona, winogrona, żurawina",
      },
      {
        type: "frequency",
        key: "vegetablesFrequency",
        label: "Jak często spożywane są warzywa i jakie konkretnie?",
        helper: "bakłażan, bataty, brokuł, burak, kukurydza, kalafior, marchew, papryka, pasternak, pomidory, por, pietruszka, rabarbar, rukola, rzodkiewka, rzepa czarna, sałata, seler, seler naciowy, cebula, cukinia, czosnek, dynia, groszek zielony, jarmuż, kalarepa, kapusta czerwona, szparagi, szpinak, szczypiorek, topinambur, ziemniaki, ogórek",
      },
      {
        type: "frequency",
        key: "legumesFrequency",
        label: "Jak często spożywane są nasiona roślin strączkowych i jakie konkretnie?",
        helper: "fasola mung, ciecierzyca, soja, soczewica, bób, fasolka szparagowa",
      },
      {
        type: "frequency",
        key: "nutsSeedsFrequency",
        label: "Jak często spożywane są orzechy i pestki i jakie konkretnie?",
        helper: "orzechy włoskie, migdały, orzechy laskowe, orzechy nerkowca, orzechy brazylijskie, pistacje, orzechy pekan, orzechy makadamia; pestki: pestki dyni, pestki słonecznika",
      },
    ],
  },
  {
    id: "sweet-intolerances",
    heading: "Słodycze",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "honeyFrequency",
        label: "Jak często spożywa Pan/Pani produkty słodkie, takie jak miód, dżem lub słodycze?",
      },
      {
        type: "frequency",
        key: "saltySnacksFrequency",
        label: "Jak często spożywane są słone przekąski?",
        helper: "orzeszki ziemne, chipsy, paluszki",
      },
      {
        type: "frequency",
        key: "sugarFrequency",
        label: "Jak często spożywany jest cukier?",
      },
    ],
  },
  {
    id: "intolerances",
    heading: "Nietolerancje i polepszacze",
    questions: [
      {
        type: "textarea",
        key: "intolerancesAllergies",
        label: "Jakich potraw Pan/Pani nie toleruje? (alergie pokarmowe)",
      },
      {
        type: "textarea",
        key: "flavorEnhancers",
        label: "Czy używa Pan/Pani kostek rosołowych, vegety i innych \u201Epolepszaczy\u201D?",
      },
    ],
  },
  {
    id: "summary",
    heading: "Podsumowanie",
    questions: [
      { type: "textarea", key: "addictions", label: "Czy posiada Pan/Pani nałogi? Jakie?" },
      { type: "textarea", key: "petsAtHome", label: "Czy są zwierzęta w domu lub były?" },
      {
        type: "textarea",
        key: "cycleRegularity",
        label: "Czy występują u Pana/Pani problemy związane z układem rozrodczym lub moczowym – np. nieregularne lub bolesne miesiączki (u kobiet) albo problemy z prostatą, oddawaniem moczu czy powiększeniem gruczołu krokowego (u mężczyzn)? lub inne",
      },
    ],
  },
];
