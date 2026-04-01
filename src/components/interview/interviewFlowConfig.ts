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
        label: "Opisz swoje dolegliwości/potrzeby — od jak dawna występują? Kiedy się nasilają i jak często?",
      },
      {
        type: "textarea",
        key: "symptomTriggers",
        label: "Czy są jakieś okoliczności które je nasilają?",
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
        label: "Czy obecnie przyjmujesz lub przyjmowałeś/aś w przeszłości leki, suplementy diety lub zioła? Jeśli tak – jakie?",
      },
      {
        type: "textarea",
        key: "infectionTendency",
        label: "Czy masz skłonność do infekcji?",
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
      { type: "input", key: "mealsPerDay", label: "Ile posiłków spożywasz w ciągu dnia?" },
      {
        type: "textarea",
        key: "snacking",
        label: "Czy podjadasz pomiędzy posiłkami? Jakie produkty?",
      },
    ],
  },
  {
    id: "daily-meals",
    heading: "Struktura posiłków",
    questions: [
      { type: "input", key: "breakfast", label: "Co jest spożywane na śniadanie?" },
      { type: "input", key: "breakfastTime", label: "Pora przyjmowania śniadania" },
      { type: "input", key: "lunch", label: "Co jest spożywane na obiad?" },
      { type: "input", key: "lunchTime", label: "Pora przyjmowania obiadu" },
      { type: "input", key: "dinner", label: "Co jest spożywane na kolację?" },
      { type: "input", key: "dinnerTime", label: "Pora przyjmowania kolacji" },
      {
        type: "textarea",
        key: "extraMeals",
        label: "Czy spożywasz więcej niż 3 posiłki dziennie? Jeśli tak, jakie są to dodatkowe posiłki i o której porze?",
      },
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
        label: "Jak często spożywane są kasze?",
        helper: "gryczane, jaglane, manna, płatki owsiane, jęczmienne, bulgur, kuskus",
      },
      {
        type: "frequency",
        key: "groatsFrequency",
        label: "Jak często spożywany jest ryż?",
        helper: "biały, basmati, brązowy, czarny, czerwony, dziki",
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
        key: "milkFrequency",
        label: "Jak często spożywane jest mleko?",
        helper: "Podaj uwagi i rodzaj: krowie, kozie, roślinne.",
      },
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
    ],
  },
  {
    id: "fats-plants",
    heading: "Tłuszcze i produkty roślinne",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "butterFrequency",
        label: "Jak często spożywane są tłuszcze zwierzęce: masło, smalec, margaryna, śmietana?",
        helper: "ilość % tłuszczu: 82, 18, 20, 30, 36",
      },
      {
        type: "frequency",
        key: "plantFatsFrequency",
        label: "Jak często spożywane są tłuszcze roślinne?",
        helper: "olej kokosowy, olej lniany, olej z czarnuszki, oliwa z oliwek, olej słonecznikowy, olej rzepakowy, olej z wiesiołka",
      },
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
    heading: "Słodycze i nietolerancje",
    layout: "two-column",
    questions: [
      {
        type: "frequency",
        key: "honeyFrequency",
        label: "Jak często spożywasz produkty słodkie: miód, dżem lub słodycze?",
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
      {
        type: "textarea",
        key: "intolerancesAllergies",
        label: "Jakich potraw nie tolerujesz? (alergie pokarmowe)",
      },
      {
        type: "textarea",
        key: "flavorEnhancers",
        label: "Czy używasz kostek rosołowych, vegety i innych \u201Epolepszaczy\u201D?",
      },
    ],
  },
  {
    id: "summary",
    heading: "Podsumowanie",
    questions: [
      { type: "textarea", key: "addictions", label: "Czy posiadasz nałogi? Jakie?" },
      { type: "textarea", key: "petsAtHome", label: "Czy są zwierzęta w domu lub były?" },
      {
        type: "textarea",
        key: "cycleRegularity",
        label: "Czy występują u Ciebie problemy związane z układem rozrodczym lub moczowym? (np. nieregularne lub bolesne miesiączki, problemy z prostatą, oddawaniem moczu lub inne)",
      },
      { type: "textarea", key: "notes", label: "Dodatkowe uwagi" },
    ],
  },
];
