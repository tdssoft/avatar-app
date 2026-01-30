import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, Phone, MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "Jak działa diagnostyka biorezonansowa?",
    answer:
      "Diagnostyka biorezonansowa to metoda analizy stanu zdrowia organizmu poprzez pomiar częstotliwości rezonansowych ciała. Na podstawie przesłanego zdjęcia i wywiadu zdrowotnego nasi specjaliści przeprowadzają analizę i przygotowują indywidualny plan terapii.",
  },
  {
    question: "Jak długo trzeba czekać na wyniki?",
    answer:
      "Standardowy czas oczekiwania na wyniki to 3-5 dni roboczych od momentu przesłania wszystkich wymaganych dokumentów i zdjęć. W przypadku pilnych potrzeb oferujemy również opcję ekspresowej analizy.",
  },
  {
    question: "Co zawiera pakiet diagnostyczny?",
    answer:
      "Pakiet diagnostyczny zawiera: pełną analizę kondycji organizmu, raport zdrowotny, indywidualny plan terapii oraz wskazówki dietetyczne. W zależności od wybranego pakietu możesz otrzymać dodatkowe elementy jak jadłospis czy plan profilaktyczny.",
  },
  {
    question: "Jak mogę zmienić swoje dane osobowe?",
    answer:
      "Aby zmienić dane osobowe, przejdź do zakładki 'Profil' w menu bocznym. Część danych możesz zmienić samodzielnie, a w przypadku danych wymagających weryfikacji skontaktuj się z naszym supportem.",
  },
  {
    question: "Jak działa program polecający?",
    answer:
      "Program polecający pozwala Ci zdobywać nagrody za polecenie Avatar znajomym. Wystarczy udostępnić swój unikalny link lub kod polecający. Gdy polecona osoba dokona zakupu, oboje otrzymujecie korzyści.",
  },
];

const Help = () => {
  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Pomoc
          </h1>
          <p className="text-muted-foreground">
            Znajdź odpowiedzi na najczęstsze pytania lub skontaktuj się z nami
          </p>
        </div>

        <div className="space-y-6">
          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Najczęstsze pytania</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skontaktuj się z nami</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border text-center">
                  <Mail className="h-8 w-8 text-accent mx-auto mb-3" />
                  <h4 className="font-medium mb-1">Email</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    kontakt@avatar.pl
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Napisz email
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-border text-center">
                  <Phone className="h-8 w-8 text-accent mx-auto mb-3" />
                  <h4 className="font-medium mb-1">Telefon</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    +48 123 456 789
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Zadzwoń
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-border text-center">
                  <MessageCircle className="h-8 w-8 text-accent mx-auto mb-3" />
                  <h4 className="font-medium mb-1">Czat</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Szybka pomoc online
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Rozpocznij czat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Help;
