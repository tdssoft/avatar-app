import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./Sidebar";
import { Bell, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, isLoading, user, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Use session for redirect check (not user) to avoid race condition
    // Session loads faster than profile, preventing the double-click bug
    if (!isLoading && !session) {
      navigate("/login");
    }
  }, [isLoading, session, navigate]);

  // Show loading spinner while session is being recovered
  if (isLoading) {
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

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "U";

  const fullName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : "Użytkownik";

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-background border-b border-border flex items-center justify-end px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {fullName}
            </span>
            <div className="h-6 w-px bg-border mx-1" />
            <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Powiadomienia">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 lg:p-12 pt-6 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
