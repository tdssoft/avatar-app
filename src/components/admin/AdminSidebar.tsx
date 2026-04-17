import { Users, Handshake, LogOut, Menu, LayoutGrid, Upload, Download, MessageCircle, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import avatarLogo from "@/assets/avatar-logo.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const adminNavItems = [
  { title: "Pacjenci", url: "/admin", icon: Users },
  { title: "Partnerzy", url: "/admin/partners", icon: Handshake },
  { title: "Pomoc", url: "/dashboard/help", icon: MessageCircle },
];

const adminExtraItems = [
  { title: "Import CSV", url: "/admin/import", icon: Upload },
  { title: "Eksport CSV", url: "/admin/export", icon: Download },
];

const AdminSidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <img
            src={avatarLogo}
            alt="Avatar centrum zdrowia"
            className="h-10 w-auto"
          />
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            ADMIN
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {adminNavItems.map((item) => (
            <li key={item.url}>
              <NavLink
                to={item.url}
                end={item.url === "/admin"}
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
                {adminExtraItems.map((item) => (
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
          
          {/* Divider */}
          <li className="my-4">
            <div className="h-px bg-border" />
          </li>
          
          {/* Switch to user dashboard */}
          <li>
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              onClick={onItemClick}
            >
              <LayoutGrid className="h-5 w-5" />
              <span>Panel użytkownika</span>
            </NavLink>
          </li>
          
          {/* Logout */}
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
};

const AdminSidebar = () => {
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
            <AdminSidebarContent onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 bg-sidebar border-r border-sidebar-border min-h-screen">
        <AdminSidebarContent />
      </aside>
    </>
  );
};

export default AdminSidebar;
