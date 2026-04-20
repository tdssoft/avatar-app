import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonProfiles } from "@/hooks/usePersonProfiles";
import Sidebar from "./Sidebar";
import { Bell, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFlowRouteGuard } from "@/hooks/useFlowRouteGuard";
import { usePatientMessages } from "@/hooks/usePatientMessages";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isLoading, user, session } = useAuth();
  const { activeProfile } = usePersonProfiles();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: isFlowLoading, redirectTo } = useFlowRouteGuard(location.pathname);
  const { unreadCount } = usePatientMessages();

  useEffect(() => {
    // Use session for redirect check (not user) to avoid race condition
    // Session loads faster than profile, preventing the double-click bug
    if (!isLoading && !session) {
      navigate("/login");
    }
  }, [isLoading, session, navigate]);

  useEffect(() => {
    if (!isLoading && !isFlowLoading && session && redirectTo && redirectTo !== location.pathname) {
      navigate(redirectTo, { replace: true });
    }
  }, [isFlowLoading, isLoading, location.pathname, navigate, redirectTo, session]);

  // Show loading spinner while session is being recovered
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session && isFlowLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No session = redirect handled by useEffect, just render null
  if (!session) {
    return null;
  }

  // Show child profile name when a non-primary profile is active
  const showChildName = activeProfile && !activeProfile.is_primary;

  const displayName = showChildName
    ? activeProfile.name
    : user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "Użytkownik";

  const userInitials = showChildName
    ? activeProfile.name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    : user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : "U";

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-background border-b border-border flex items-center justify-end pl-16 pr-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {displayName}
            </span>
            <div className="h-6 w-px bg-border mx-1" />
            <button
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Wiadomości"
              onClick={() => navigate("/dashboard/messages")}
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 lg:p-12 pt-6 lg:pt-8 bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
