import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Calendar,
  Check,
} from "lucide-react";
import { usePersonProfiles, PersonProfile } from "@/hooks/usePersonProfiles";
import { AddProfileDialog } from "./AddProfileDialog";
import { EditProfileDialog } from "./EditProfileDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function PersonProfilesSection() {
  const {
    profiles,
    activeProfile,
    switchActiveProfile,
    deleteProfile,
    isLoading,
  } = usePersonProfiles();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PersonProfile | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deletingProfileId) {
      await deleteProfile(deletingProfileId);
      setDeletingProfileId(null);
    }
  };

  const getGenderLabel = (gender: string | null) => {
    switch (gender) {
      case "male":
        return "Mężczyzna";
      case "female":
        return "Kobieta";
      case "other":
        return "Inna";
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("pl-PL");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Moje profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Moje profile
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Brak profili. Dodaj pierwszy profil, aby rozpocząć.
            </p>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                  profile.id === activeProfile?.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                )}
              >
                {/* Selection indicator */}
                <button
                  onClick={() => switchActiveProfile(profile.id)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    profile.id === activeProfile?.id
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-muted-foreground/30 hover:border-accent"
                  )}
                >
                  {profile.id === activeProfile?.id && (
                    <Check className="h-3 w-3" />
                  )}
                </button>

                {/* Profile info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{profile.name}</span>
                    {profile.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Główny
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {profile.birth_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(profile.birth_date)}
                      </span>
                    )}
                    {profile.gender && (
                      <span>{getGenderLabel(profile.gender)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingProfile(profile)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!profile.is_primary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingProfileId(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <AddProfileDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Edit Dialog */}
      {editingProfile && (
        <EditProfileDialog
          profile={editingProfile}
          open={!!editingProfile}
          onOpenChange={(open) => !open && setEditingProfile(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingProfileId}
        onOpenChange={(open) => !open && setDeletingProfileId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Wszystkie dane powiązane z tym
              profilem zostaną utracone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
