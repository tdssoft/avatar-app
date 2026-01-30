import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getReferralsByCode,
  getReferralStats,
  generateReferralLink,
  copyToClipboard,
  Referral,
} from "@/lib/referral";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, UserCheck, Clock, Share2 } from "lucide-react";

const Referrals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 });
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (user?.referralCode) {
      setReferrals(getReferralsByCode(user.referralCode));
      setStats(getReferralStats(user.referralCode));
      setReferralLink(generateReferralLink(user.referralCode));
    }
  }, [user?.referralCode]);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      toast({
        title: "Skopiowano!",
        description: "Link polecający został skopiowany do schowka",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie udało się skopiować linku",
      });
    }
  };

  const handleCopyCode = async () => {
    if (user?.referralCode) {
      const success = await copyToClipboard(user.referralCode);
      if (success) {
        toast({
          title: "Skopiowano!",
          description: "Kod polecający został skopiowany do schowka",
        });
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Program polecający
          </h1>
          <p className="text-muted-foreground">
            Poleć Avatar znajomym i zdobywaj nagrody!
          </p>
        </div>

        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.total}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Wszystkie polecenia
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.pending}
                    </p>
                    <p className="text-sm text-muted-foreground">Oczekujące</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <UserCheck className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.active}
                    </p>
                    <p className="text-sm text-muted-foreground">Aktywne</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral link section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5 text-accent" />
                Twój link polecający
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="flex-1" />
                <Button onClick={handleCopyLink} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiuj link
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">lub użyj kodu:</p>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 bg-muted rounded-md font-mono text-sm font-bold">
                    {user?.referralCode}
                  </code>
                  <Button
                    onClick={handleCopyCode}
                    variant="ghost"
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                Jak to działa?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-accent">1</span>
                  </div>
                  <h4 className="font-medium mb-2">Udostępnij link</h4>
                  <p className="text-sm text-muted-foreground">
                    Podziel się swoim unikalnym linkiem ze znajomymi
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-accent">2</span>
                  </div>
                  <h4 className="font-medium mb-2">Znajomy się rejestruje</h4>
                  <p className="text-sm text-muted-foreground">
                    Polecona osoba zakłada konto używając Twojego linku
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl font-bold text-accent">3</span>
                  </div>
                  <h4 className="font-medium mb-2">Oboje zyskujecie</h4>
                  <p className="text-sm text-muted-foreground">
                    Po zakupie pakietu oboje otrzymujecie zniżkę
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rewards info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nagrody</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="p-2 rounded-full bg-accent/10">
                    <Gift className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">Za każde aktywne polecenie</h4>
                    <p className="text-sm text-muted-foreground">
                      Otrzymujesz <strong>10% zniżki</strong> na kolejny pakiet
                      diagnostyczny
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="p-2 rounded-full bg-secondary">
                    <Users className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Za 5 aktywnych poleceń</h4>
                    <p className="text-sm text-muted-foreground">
                      Otrzymujesz <strong>darmowy Mini Pakiet Startowy</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="p-2 rounded-full bg-accent/10">
                    <UserCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">Dla poleconej osoby</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>5% zniżki</strong> na pierwszy zakup
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referrals list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historia poleceń</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Osoba</TableHead>
                      <TableHead>Data rejestracji</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referral.referredName}</p>
                            <p className="text-sm text-muted-foreground">
                              {referral.referredEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(referral.createdAt).toLocaleDateString(
                            "pl-PL"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              referral.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {referral.status === "active"
                              ? "Aktywna"
                              : "Oczekująca"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-medium mb-2">Brak poleceń</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nie masz jeszcze żadnych poleceń. Udostępnij swój link
                    znajomym!
                  </p>
                  <Button onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiuj link polecający
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Referrals;
