import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Users, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: "Wgraj zdjęcie",
      description: "Dodaj zdjęcie do analizy biorezonansowej",
      icon: Upload,
      href: "#",
      color: "bg-accent/10 text-accent",
    },
    {
      title: "Twoje wyniki",
      description: "Sprawdź wyniki diagnostyki",
      icon: FileText,
      href: "/dashboard/results",
      color: "bg-accent/10 text-accent",
    },
    {
      title: "Poleć znajomym",
      description: "Zaproś znajomych i zdobądź nagrody",
      icon: Users,
      href: "/dashboard/referrals",
      color: "bg-secondary text-foreground",
    },
    {
      title: "Potrzebujesz pomocy?",
      description: "Skontaktuj się z nami",
      icon: HelpCircle,
      href: "/dashboard/help",
      color: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Witaj, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Co chciałbyś dziś zrobić?
          </p>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${action.color}`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Upload section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wgraj pliki</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Przeciągnij pliki tutaj lub kliknij, aby wybrać
              </p>
              <Button variant="outline">
                Wybierz pliki
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
