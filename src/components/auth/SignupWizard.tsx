import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, Upload, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const step1Schema = z.object({
  photoOption: z.enum(["upload", "later"]),
});

const step2Schema = z.object({
  avatarChoice: z.string().optional(),
});

const step3Schema = z
  .object({
    phone: z.string().min(9, "Podaj poprawny numer telefonu").max(15),
    email: z.string().email("Podaj poprawny adres email"),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const AVATAR_CHOICES = ["Avatar 1", "Avatar 2", "Avatar 3", "Avatar 4"];

const SignupWizard = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const refCode = searchParams.get("ref") ?? "";

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { photoOption: "upload" },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { avatarChoice: "" },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: refCode,
    },
  });

  const photoOption = step1Form.watch("photoOption");

  const progress = useMemo(() => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    return 3;
  }, [step]);

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Nieprawidłowy plik",
        description: "Wybierz plik graficzny (JPG, PNG, WEBP).",
      });
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Plik jest za duży",
        description: "Maksymalny rozmiar zdjęcia to 5 MB.",
      });
      event.target.value = "";
      return;
    }

    setSelectedPhoto(file);
    step1Form.setValue("photoOption", "upload");
    toast({ title: "Zdjęcie wybrane", description: file.name });
  };

  const handleStep1Submit = (data: Step1Data) => {
    if (data.photoOption === "upload" && !selectedPhoto) {
      toast({
        variant: "destructive",
        title: "Wgraj zdjęcie",
        description: "Wybierz zdjęcie zapisane na urządzeniu albo zaznacz opcję później.",
      });
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = (_data: Step2Data) => {
    if (!selectedPhoto && !selectedAvatar && photoOption !== "later") {
      toast({
        variant: "destructive",
        title: "Wybierz zdjęcie lub avatar",
        description: "Wgraj zdjęcie albo wybierz jeden z avatarów.",
      });
      return;
    }
    setStep(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setIsLoading(true);

    try {
      const result = await signup({
        firstName: "",
        lastName: "",
        phone: data.phone,
        email: data.email,
        password: data.password,
        photoOption,
        photoFile: selectedPhoto ?? undefined,
        referralCode: data.referralCode,
      });

      if (!result.success) {
        let errorMessage = "Wystąpił błąd podczas rejestracji";
        if (result.error?.includes("User already registered")) {
          errorMessage = "Konto z tym adresem email już istnieje";
        }
        toast({ variant: "destructive", title: "Błąd rejestracji", description: errorMessage });
        return;
      }

      toast({ title: "Rejestracja udana", description: "Sprawdź email i aktywuj konto." });
      navigate("/signup/verify-email", { state: { email: data.email } });
    } catch {
      toast({ variant: "destructive", title: "Błąd", description: "Wystąpił błąd podczas rejestracji" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full ${s <= progress ? "bg-accent" : "bg-muted"}`} />
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-2">Krok {step}/3</p>

      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">Wybierz opcję zdjęcia</h1>
          <p className="text-muted-foreground mb-8">Wybierz zdjęcie zapisane na urządzeniu lub dodaj je później.</p>

          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

            <RadioGroup
              value={photoOption}
              onValueChange={(value) => {
                const option = value as "upload" | "later";
                step1Form.setValue("photoOption", option);
                if (option === "upload") openPhotoPicker();
              }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border">
                <RadioGroupItem value="upload" id="upload" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="upload" className="cursor-pointer">Wybierz zdjęcie zapisane na urządzeniu</Label>
                  <button type="button" onClick={openPhotoPicker} className="mt-2 text-sm text-accent hover:underline block">
                    {selectedPhoto ? "Zmień zdjęcie" : "Wgraj zdjęcie"}
                  </button>
                  {selectedPhoto ? <p className="text-xs text-muted-foreground mt-1">{selectedPhoto.name}</p> : null}
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border">
                <RadioGroupItem value="later" id="later" className="mt-1" />
                <Label htmlFor="later" className="cursor-pointer">Wgraj zdjęcie później</Label>
              </div>
            </RadioGroup>

            <div className="flex justify-between">
              <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Powrót
              </Link>
              <Button type="submit">Dalej {"->"}</Button>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">Wgraj zdjęcie / wybierz Avatar-a</h1>
          <p className="text-muted-foreground mb-8">Możesz użyć swojego zdjęcia lub wybrać domyślny avatar.</p>

          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {AVATAR_CHOICES.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    step2Form.setValue("avatarChoice", avatar);
                  }}
                  className={`border rounded-lg p-4 flex flex-col items-center gap-2 transition-colors ${
                    selectedAvatar === avatar ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <UserCircle2 className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm">{avatar}</span>
                </button>
              ))}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={openPhotoPicker}>
              <Upload className="h-4 w-4 mr-2" />
              {selectedPhoto ? "Zmień zdjęcie" : "Wgraj zdjęcie"}
            </Button>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Wstecz
              </button>
              <Button type="submit">Dalej {"->"}</Button>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">Ustaw login i hasło</h1>
          <p className="text-muted-foreground mb-8">Podaj dane kontaktowe i utwórz konto.</p>

          <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Numer telefonu</Label>
              <Input id="phone" placeholder="123456789" {...step3Form.register("phone")} />
              {step3Form.formState.errors.phone && (
                <p className="text-sm text-destructive">{step3Form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adres E-mail</Label>
              <Input id="email" type="email" placeholder="twoj@email.pl" {...step3Form.register("email")} />
              {step3Form.formState.errors.email && (
                <p className="text-sm text-destructive">{step3Form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 znaków"
                  {...step3Form.register("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {step3Form.formState.errors.password && (
                <p className="text-sm text-destructive">{step3Form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Powtórz Hasło</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Powtórz hasło"
                  {...step3Form.register("confirmPassword")}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {step3Form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{step3Form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Kod polecający (opcjonalnie)</Label>
              <Input id="referralCode" {...step3Form.register("referralCode")} />
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Wstecz
              </button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Rejestracja..." : "Rejestracja"}</Button>
            </div>
          </form>
        </>
      )}

      <p className="text-center mt-6 text-muted-foreground">
        Posiadasz już konto? <Link to="/login" className="text-accent hover:underline">Zaloguj się</Link>
      </p>
    </div>
  );
};

export default SignupWizard;
