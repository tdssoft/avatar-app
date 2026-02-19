import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import avatarLogo from "@/assets/avatar-logo.svg";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  
  return !!data;
};

const loginSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        // Check if user is admin and redirect accordingly
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isAdmin = await checkIsAdmin(user.id);
          if (isAdmin) {
            navigate("/admin");
            return;
          }

          navigate("/dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        // Map Supabase error messages to Polish
        let errorMessage = "Nieprawidłowy email lub hasło";
        if (result.error?.includes("Invalid login credentials")) {
          errorMessage = "Nieprawidłowy email lub hasło";
        } else if (result.error?.includes("Email not confirmed")) {
          errorMessage = "Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.";
        }
        toast({
          variant: "destructive",
          title: "Błąd logowania",
          description: errorMessage,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Wystąpił błąd podczas logowania",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value?.trim();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Podaj email",
        description: "Najpierw wpisz adres email, aby wysłać link resetujący hasło.",
      });
      return;
    }

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;

      toast({
        title: "Link wysłany",
        description: "Sprawdź skrzynkę email i ustaw nowe hasło.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się wysłać linku resetującego.";
      toast({
        variant: "destructive",
        title: "Błąd",
        description: message,
      });
    } finally {
      setIsSendingReset(false);
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

      <h1 className="text-2xl font-bold text-foreground mb-2">Witamy w Avatar!</h1>
      <p className="text-muted-foreground mb-8">
        Wprowadź swoje dane, aby się zalogować.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="E-mail"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Hasło"
              {...register("password")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
            />
            <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
              Zapisz moje dane
            </Label>
          </div>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isSendingReset}
            className="text-sm text-accent hover:underline disabled:opacity-60"
          >
            {isSendingReset ? "Wysyłanie..." : "Zapomniałeś hasła?"}
          </button>
        </div>

        <Button type="submit" variant="black" className="w-full" disabled={isLoading}>
          {isLoading ? "Logowanie..." : "Log in"}
        </Button>
      </form>

      <p className="text-center mt-6 text-muted-foreground">
        Nie masz konta?{" "}
        <Link to="/signup" className="text-accent hover:underline font-medium">
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
