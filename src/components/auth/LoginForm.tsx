import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import avatarLogo from "@/assets/avatar-logo.svg";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Podaj poprawny adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
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
      const success = await login(data.email, data.password);
      if (success) {
        navigate("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Błąd logowania",
          description: "Nieprawidłowy email lub hasło",
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

      <h1 className="text-2xl font-bold text-foreground mb-2">
        Zaloguj się
      </h1>
      <p className="text-muted-foreground mb-8">
        Wprowadź swoje dane, aby się zalogować
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="twoj@email.pl"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Logowanie..." : "Zaloguj się"}
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
