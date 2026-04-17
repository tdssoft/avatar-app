import { useState, forwardRef } from "react";
import { ChevronDown, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePersonProfiles, PersonProfile } from "@/hooks/usePersonProfiles";
import { AddProfileDialog } from "./AddProfileDialog";
import { cn } from "@/lib/utils";

interface ProfileSelectorProps {
  compact?: boolean;
  className?: string;
}

export const ProfileSelector = forwardRef<HTMLDivElement, ProfileSelectorProps>(
  function ProfileSelector({ compact = false, className }, ref) {
  const { profiles, activeProfile, switchActiveProfile, isLoading } = usePersonProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading || profiles.length === 0) {
    return null;
  }

  return (
    <div ref={ref}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-2 hover:bg-background",
              compact ? "px-2 py-1" : "px-3 py-2",
              className
            )}
          >
            <Users className="h-4 w-4 text-accent" />
            {!compact && (
              <span className="text-sm font-medium truncate max-w-[120px]">
                {activeProfile?.name || "Wybierz profil"}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Aktywny profil
          </div>
          {profiles.map((profile) => (
            <DropdownMenuItem
              key={profile.id}
              onClick={() => switchActiveProfile(profile.id)}
              className={cn(
                "cursor-pointer",
                profile.id === activeProfile?.id && "bg-accent/10"
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    profile.id === activeProfile?.id
                      ? "bg-accent"
                      : "bg-muted-foreground/30"
                  )}
                />
                <span className="flex-1 truncate">{profile.name}</span>
                {profile.is_primary && (
                  <span className="text-xs text-muted-foreground">(główny)</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer text-accent"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Dodaj profil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddProfileDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
});
