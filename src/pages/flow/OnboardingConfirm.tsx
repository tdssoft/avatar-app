import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const OnboardingConfirm = () => {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: "destructive", title: "Brak danych", description: "Uzupełnij imię i nazwisko." });
      return;
    }

    setIsSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      await supabase
        .from("person_profiles")
        .update({ name: `${firstName.trim()} ${lastName.trim()}` })
        .eq("account_user_id", user?.id)
        .eq("is_primary", true);

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          onboardingConfirmed: true,
        },
      });

      if (authError) throw authError;

      await refreshUser();
      toast({ title: "Dane zapisane", description: "Możesz rozpocząć pracę w aplikacji." });
      navigate("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nie udało się zapisać danych";
      toast({ variant: "destructive", title: "Błąd", description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Witamy w aplikacji Avatar!</CardTitle>
            <p className="text-muted-foreground">
              Uzupełnij dane osobowe i przejdź dalej do diagnostyki.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Numer telefonu</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="123456789" />
            </div>

            <Button onClick={handleSubmit} disabled={isSaving} className="w-full md:w-auto">
              {isSaving ? "Zapisywanie..." : "Zaczynamy ->"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OnboardingConfirm;
