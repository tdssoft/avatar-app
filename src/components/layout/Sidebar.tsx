import { LayoutGrid, Shield, User, MessageCircle, Handshake, LogOut, Menu, Settings, FileText, ClipboardList, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import avatarLogo from "@/assets/avatar-logo.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, forwardRef } from "react";
import { ProfileSelector } from "@/components/profile/ProfileSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Wyniki badań", url: "/dashboard/results", icon: Shield },
  { title: "Mój profil", url: "/dashboard/profile", icon: User },
  { title: "Pomoc", url: "/dashboard/help", icon: MessageCircle },
  { title: "Program polecający", url: "/dashboard/referrals", icon: Handshake },
];

const extraNavItems = [
  { title: "Moje zalecenia", url: "/dashboard/recommendations", icon: FileText },
  { title: "Wywiad żywieniowy", url: "/interview", icon: ClipboardList },
];

const SidebarContent = forwardRef<HTMLDivElement, { onItemClick?: () => void }>(
  function SidebarContent({ onItemClick }, ref) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdminRole();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div ref={ref} className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <img
          src={avatarLogo}
          alt="Avatar centrum zdrowia"
          className="h-10 w-auto"
        />
      </div>

      {/* Profile Selector */}
      <div className="px-4 py-3 border-b border-border">
        <ProfileSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.url}>
              <NavLink
                to={item.url}
                end={item.url === "/dashboard"}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                activeClassName="bg-background text-foreground font-medium"
                onClick={onItemClick}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
          <li className="pt-2">
            <Collapsible>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors">
                <span className="font-medium">Więcej</span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 space-y-1">
                {extraNavItems.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                    activeClassName="bg-background text-foreground font-medium"
                    onClick={onItemClick}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.title}</span>
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </li>
          {/* Admin Panel Link */}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                activeClassName="bg-background text-foreground font-medium"
                onClick={onItemClick}
              >
                <Settings className="h-5 w-5" />
                <span>Panel admina</span>
              </NavLink>
            </li>
          )}
          {/* Logout - directly after navigation items */}
          <li>
            <button
              onClick={() => {
                handleLogout();
                onItemClick?.();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Wyloguj</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
});

const Sidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-card">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <SidebarContent onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 bg-sidebar border-r border-sidebar-border min-h-screen">
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
