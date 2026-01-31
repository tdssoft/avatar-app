import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import AdminSidebar from "./AdminSidebar";
import { Bell, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { session, user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!session) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/dashboard");
      }
    }
  }, [authLoading, roleLoading, session, isAdmin, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return null;
  }

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "A";

  const fullName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : "Administrator";

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-background border-b border-border flex items-center justify-end px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
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

export default AdminLayout;
