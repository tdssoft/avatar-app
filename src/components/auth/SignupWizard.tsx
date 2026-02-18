import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const step1Schema = z.object({
  photoOption: z.enum(["upload", "later"]),
});

const step3Schema = z
  .object({
    phone: z.string().min(9, "Podaj poprawny numer telefonu").max(15),
    email: z.string().email("Podaj poprawny adres email"),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const SignupWizard = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { photoOption: "upload" },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
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

    // Figma: 10 MB max
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Plik jest za duży",
        description: "Maksymalny rozmiar zdjęcia to 10 MB.",
      });
      event.target.value = "";
      return;
    }

    setSelectedPhoto(file);
    toast({ title: "Zdjęcie wybrane", description: file.name });
  };

  const requirePhotoToast = () =>
    toast({
      variant: "destructive",
      title: "Wgraj zdjęcie",
      description: "Wybierz zdjęcie zapisane na urządzeniu albo zaznacz opcję później.",
    });

  const handleStep1Submit = (data: Step1Data) => {
    setStep(data.photoOption === "later" ? 3 : 2);
  };

  const handleStep2Submit = () => {
    if (!selectedPhoto) {
      requirePhotoToast();
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
        photoFile: photoOption === "upload" ? selectedPhoto ?? undefined : undefined,
      });

      if (!result.success) {
        let errorMessage = "Wystąpił błąd podczas rejestracji";
        if (result.error?.includes("User already registered")) {
          errorMessage = "Konto z tym adresem email już istnieje";
        }
        toast({ variant: "destructive", title: "Błąd rejestracji", description: errorMessage });
        return;
      }

      navigate("/signup/verify-email", { state: { email: data.email } });
    } catch {
      toast({ variant: "destructive", title: "Błąd", description: "Wystąpił błąd podczas rejestracji" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setPhotoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  return (
    <div>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full ${s <= progress ? "bg-accent" : "bg-muted"}`} />
        ))}
      </div>

      {step === 1 && (
        <>
          <p className="text-sm text-muted-foreground mb-2">Krok 1/3</p>
          <h1 className="text-2xl font-bold text-foreground mb-6">Wybierz opcję zdjęcia</h1>

          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            <RadioGroup
              value={photoOption}
              onValueChange={(value) => step1Form.setValue("photoOption", value as "upload" | "later")}
              className="space-y-4"
            >
              <div className="flex items-start gap-4 rounded-lg border border-border p-4">
                <RadioGroupItem value="upload" id="upload" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="upload" className="font-medium cursor-pointer">
                    Wybierz zdjęcie zapisane na urządzeniu
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      step1Form.setValue("photoOption", "upload");
                      setStep(2);
                    }}
                    className="mt-2 text-sm text-accent hover:underline block"
                  >
                    Wgraj zdjęcie
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-border p-4">
                <RadioGroupItem value="later" id="later" className="mt-1" />
                <Label htmlFor="later" className="font-medium cursor-pointer">
                  Wgraj zdjęcie później
                </Label>
              </div>
            </RadioGroup>

            <div className="rounded-lg bg-muted p-4 flex gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-semibold">Dlaczego zdjęcie jest potrzebne?</p>
                <p className="text-muted-foreground">
                  Diagnoza powstaje na podstawie Twojego zdjęcia, dlatego przesłanie go jest niezbędne. Możesz wgrać
                  zdjęcie później.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button type="submit" variant="black" className="w-full">
                Dalej {"->"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Posiadasz już konto?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Zaloguj się
                </Link>
              </p>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-muted-foreground mb-2">Krok 2/3</p>
          <h1 className="text-2xl font-bold text-foreground mb-6">Wgraj zdjęcie</h1>

          <form onSubmit={(e) => { e.preventDefault(); handleStep2Submit(); }} className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStep2Submit();
            }}
            className="space-y-6"
          >
            <button
              type="button"
              onClick={openPhotoPicker}
              className="w-full rounded-lg border-2 border-dashed border-border p-10 text-center hover:bg-muted/40 transition-colors"
            >
              <p className="font-medium text-foreground">Wybierz plik</p>
              <p className="text-xs text-muted-foreground mt-1">jpg, png, maksymalny rozmiar 10 MB.</p>
              {selectedPhoto ? <p className="text-xs text-muted-foreground mt-3">{selectedPhoto.name}</p> : null}
            </button>

            {photoPreviewUrl ? (
              <div className="rounded-lg border border-border p-3">
                <img
                  src={photoPreviewUrl}
                  alt="Podgląd wybranego avatara"
                  className="h-48 w-48 rounded-md border border-border object-cover"
                />
              </div>
            ) : null}

            <div className="rounded-lg bg-muted p-4 flex gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Upewnij się, że na zdjęciu widać tylko Ciebie. Przesłanie innej osoby na zdjęciu może doprowadzić do
                błędnej diagnozy.
              </p>
            </div>

            <div className="space-y-3">
              <Button type="submit" variant="black" className="w-full">
                Dalej {"->"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Posiadasz już konto?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Zaloguj się
                </Link>
              </p>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-sm text-muted-foreground mb-2">Krok 3/3</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Ustaw login i hasło</h1>

          <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Numer Telefonu</Label>
              <Input id="phone" placeholder="Numer Telefonu" {...step3Form.register("phone")} />
              {step3Form.formState.errors.phone && (
                <p className="text-sm text-destructive">{step3Form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adres E-mail</Label>
              <Input id="email" type="email" placeholder="Adres E-mail" {...step3Form.register("email")} />
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
                  placeholder="Hasło"
                  {...step3Form.register("password")}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
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
                  placeholder="Powtórz Hasło"
                  {...step3Form.register("confirmPassword")}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {step3Form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{step3Form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <Button type="submit" variant="black" className="w-full" disabled={isLoading}>
                {isLoading ? "Rejestracja..." : "Rejestracja"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Posiadasz już konto?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Zaloguj się
                </Link>
              </p>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default SignupWizard;
