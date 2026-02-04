import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, Loader2, Save, X } from "lucide-react";
import { PersonProfilesSection } from "@/components/profile/PersonProfilesSection";
import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable fields
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Dane zostały zaktualizowane");
      setIsEditing(false);
      
      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error("[Profile] Error saving:", error);
      toast.error(error.message || "Nie udało się zapisać danych");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone(user?.phone || "");
    setIsEditing(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Twój profil
          </h1>
          <p className="text-white/80">
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
                  <Input 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nazwisko</Label>
                  <Input 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing} 
                  />
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
                <p className="text-xs text-muted-foreground">
                  Email nie może być zmieniony
                </p>
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm">
                    +48
                  </div>
                  <Input 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing} 
                    className="flex-1" 
                    placeholder="123456789"
                  />
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
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              Zmień hasło
            </Button>
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Anuluj
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Zapisz
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                Edytuj dane
              </Button>
            )}
          </div>
        </div>
      </div>

      <ChangePasswordDialog 
        open={isPasswordDialogOpen} 
        onOpenChange={setIsPasswordDialogOpen} 
      />
    </DashboardLayout>
  );
};

export default Profile;
