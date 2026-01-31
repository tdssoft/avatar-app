import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, SignupData } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import avatarLogo from "@/assets/avatar-logo.svg";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Clock } from "lucide-react";

// Step 1 - Photo option
const step1Schema = z.object({
  photoOption: z.enum(["upload", "later"]),
});

// Step 2 - Personal data
const step2Schema = z.object({
  firstName: z.string().min(2, "Imię musi mieć minimum 2 znaki").max(50),
  lastName: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki").max(50),
  phone: z.string().min(9, "Podaj poprawny numer telefonu").max(15),
  referralCode: z.string().optional(),
});

// Step 3 - Account data
const step3Schema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Musisz zaakceptować regulamin",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const SignupWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SignupData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      photoOption: "later",
    },
  });

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      referralCode: refCode || "",
    },
  });

  // Step 3 form
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const handleStep1Submit = (data: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setIsLoading(true);
    const finalData: SignupData = {
      ...(formData as Omit<SignupData, "email" | "password">),
      email: data.email,
      password: data.password,
    };

    try {
      const result = await signup(finalData);
      if (result.success) {
        toast({
          title: "Rejestracja udana!",
          description: "Sprawdź swoją skrzynkę email, aby potwierdzić konto.",
        });
        navigate("/login");
      } else {
        // Map Supabase error messages to Polish
        let errorMessage = "Wystąpił błąd podczas rejestracji";
        if (result.error?.includes("User already registered")) {
          errorMessage = "Konto z tym adresem email już istnieje";
        } else if (result.error?.includes("Password should be")) {
          errorMessage = "Hasło nie spełnia wymagań bezpieczeństwa";
        }
        toast({
          variant: "destructive",
          title: "Błąd rejestracji",
          description: errorMessage,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Wystąpił błąd podczas rejestracji",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden mb-8">
        <img
          src={avatarLogo}
          alt="Avatar centrum zdrowia"
          className="h-12 w-auto"
        />
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-accent" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        Krok {step} z 3
      </p>

      {/* Step 1 - Photo option */}
      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Wybór zdjęcia
          </h1>
          <p className="text-muted-foreground mb-8">
            Zdjęcie pomoże nam lepiej dopasować diagnostykę
          </p>

          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            <RadioGroup
              defaultValue={step1Form.getValues("photoOption")}
              onValueChange={(value) => step1Form.setValue("photoOption", value as "upload" | "later")}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer">
                <RadioGroupItem value="upload" id="upload" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="upload" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Upload className="h-5 w-5 text-accent" />
                    Wybierz zdjęcie zapisane na urządzeniu
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wgraj swoje zdjęcie teraz
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer">
                <RadioGroupItem value="later" id="later" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="later" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Wgraj zdjęcie później
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Możesz dodać zdjęcie po rejestracji
                  </p>
                </div>
              </div>
            </RadioGroup>

            <div className="bg-accent/10 p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Dlaczego potrzebujemy zdjęcia?</strong>
                <br />
                Zdjęcie pomaga w analizie biorezonansowej i lepszym dopasowaniu planu terapii do Twoich indywidualnych potrzeb.
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Link
                to="/login"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Powrót do logowania
              </Link>
              <Button type="submit">Dalej</Button>
            </div>
          </form>
        </>
      )}

      {/* Step 2 - Personal data */}
      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Dane osobowe
          </h1>
          <p className="text-muted-foreground mb-8">
            Podaj swoje podstawowe dane
          </p>

          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <Input
                  id="firstName"
                  placeholder="Jan"
                  {...step2Form.register("firstName")}
                />
                {step2Form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {step2Form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input
                  id="lastName"
                  placeholder="Kowalski"
                  {...step2Form.register("lastName")}
                />
                {step2Form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {step2Form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numer telefonu</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm">
                  +48
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="123 456 789"
                  className="flex-1"
                  {...step2Form.register("phone")}
                />
              </div>
              {step2Form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {step2Form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Kod polecający (opcjonalnie)</Label>
              <Input
                id="referralCode"
                placeholder="Wpisz kod jeśli posiadasz"
                {...step2Form.register("referralCode")}
              />
              <p className="text-xs text-muted-foreground">
                Jeśli ktoś Ci polecił Avatar, wpisz jego kod polecający
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Wstecz
              </button>
              <Button type="submit">Dalej</Button>
            </div>
          </form>
        </>
      )}

      {/* Step 3 - Account data */}
      {step === 3 && (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Dane logowania
          </h1>
          <p className="text-muted-foreground mb-8">
            Utwórz swoje konto w Avatar
          </p>

          <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.pl"
                {...step3Form.register("email")}
              />
              {step3Form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {step3Form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 znaków"
                {...step3Form.register("password")}
              />
              {step3Form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {step3Form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Powtórz hasło</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Powtórz hasło"
                {...step3Form.register("confirmPassword")}
              />
              {step3Form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {step3Form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="acceptTerms"
                onCheckedChange={(checked) =>
                  step3Form.setValue("acceptTerms", checked as boolean)
                }
              />
              <div className="space-y-1">
                <Label htmlFor="acceptTerms" className="text-sm cursor-pointer">
                  Akceptuję{" "}
                  <a href="#" className="text-accent hover:underline">
                    regulamin
                  </a>{" "}
                  i{" "}
                  <a href="#" className="text-accent hover:underline">
                    politykę prywatności
                  </a>
                </Label>
                {step3Form.formState.errors.acceptTerms && (
                  <p className="text-sm text-destructive">
                    {step3Form.formState.errors.acceptTerms.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Wstecz
              </button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Rejestracja..." : "Zarejestruj się"}
              </Button>
            </div>
          </form>
        </>
      )}

      <p className="text-center mt-6 text-muted-foreground">
        Masz już konto?{" "}
        <Link to="/login" className="text-accent hover:underline font-medium">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
};

export default SignupWizard;
