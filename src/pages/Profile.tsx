import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar } from "lucide-react";
import { PersonProfilesSection } from "@/components/profile/PersonProfilesSection";

const Profile = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Twój profil
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi danymi osobowymi
          </p>
        </div>

        <div className="space-y-6">
          {/* Person profiles section */}
          <PersonProfilesSection />

          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                Dane osobowe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imię</Label>
                  <Input value={user?.firstName || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Nazwisko</Label>
                  <Input value={user?.lastName || ""} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-accent" />
                Dane kontaktowe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm">
                    +48
                  </div>
                  <Input value={user?.phone || ""} disabled className="flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Informacje o koncie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data rejestracji</Label>
                <Input
                  value={
                    user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("pl-PL")
                      : ""
                  }
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Twój kod polecający</Label>
                <Input value={user?.referralCode || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  Podziel się tym kodem ze znajomymi, aby zdobyć nagrody
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1">
              Zmień hasło
            </Button>
            <Button variant="outline" className="flex-1">
              Edytuj dane
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
