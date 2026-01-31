import { useState, useEffect } from "react";
import { Plus, Link as LinkIcon } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  referral_code: string | null;
  referrals_count: number;
  shop_links: ShopLink[];
}

interface ShopLink {
  id: string;
  shop_url: string;
  shop_name: string | null;
}

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [newLinkData, setNewLinkData] = useState({ shopName: "", shopUrl: "" });
  const [isAddingLink, setIsAddingLink] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      // Get all profiles with referral codes (potential partners)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, referral_code")
        .not("referral_code", "is", null);

      if (profilesError) throw profilesError;

      // Get referral counts for each user
      const { data: referrals, error: referralsError } = await supabase
        .from("referrals")
        .select("referrer_user_id");

      if (referralsError) throw referralsError;

      // Get shop links
      const { data: shopLinks, error: shopLinksError } = await supabase
        .from("partner_shop_links")
        .select("*");

      if (shopLinksError) throw shopLinksError;

      // Count referrals per user
      const referralCounts: Record<string, number> = {};
      referrals?.forEach((ref) => {
        referralCounts[ref.referrer_user_id] = (referralCounts[ref.referrer_user_id] || 0) + 1;
      });

      // Group shop links by partner
      const linksByPartner: Record<string, ShopLink[]> = {};
      shopLinks?.forEach((link) => {
        if (!linksByPartner[link.partner_user_id]) {
          linksByPartner[link.partner_user_id] = [];
        }
        linksByPartner[link.partner_user_id].push({
          id: link.id,
          shop_url: link.shop_url,
          shop_name: link.shop_name,
        });
      });

      // Filter to only show users who have referrals or shop links
      const partnersData = profiles
        ?.filter((p) => referralCounts[p.user_id] > 0 || linksByPartner[p.user_id]?.length > 0)
        .map((p) => ({
          user_id: p.user_id,
          first_name: p.first_name,
          last_name: p.last_name,
          referral_code: p.referral_code,
          referrals_count: referralCounts[p.user_id] || 0,
          shop_links: linksByPartner[p.user_id] || [],
        })) || [];

      setPartners(partnersData);
    } catch (error) {
      console.error("[Partners] Error:", error);
      toast.error("Nie udało się załadować partnerów");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkData.shopUrl.trim() || !selectedPartnerId) return;

    setIsAddingLink(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("partner_shop_links")
        .insert({
          partner_user_id: selectedPartnerId,
          shop_url: newLinkData.shopUrl.trim(),
          shop_name: newLinkData.shopName.trim() || null,
          added_by_admin_id: userData.user?.id,
        });

      if (error) throw error;

      toast.success("Link do sklepu został dodany");
      setDialogOpen(false);
      setNewLinkData({ shopName: "", shopUrl: "" });
      setSelectedPartnerId(null);
      fetchPartners();
    } catch (error) {
      console.error("[Partners] Error adding link:", error);
      toast.error("Nie udało się dodać linku");
    } finally {
      setIsAddingLink(false);
    }
  };

  const openAddLinkDialog = (userId: string) => {
    setSelectedPartnerId(userId);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Partnerzy polecający</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj partnerami i ich linkami do sklepów
          </p>
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lista partnerów</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : partners.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Brak partnerów do wyświetlenia. Partnerzy pojawią się tutaj po poleceniu pierwszego użytkownika.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Imię i nazwisko</TableHead>
                      <TableHead className="font-semibold">Linki do sklepów</TableHead>
                      <TableHead className="font-semibold">Ilość zarejestrowanych kont</TableHead>
                      <TableHead className="font-semibold">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => {
                      const fullName = partner.first_name && partner.last_name
                        ? `${partner.first_name} ${partner.last_name}`
                        : "Nieznany partner";

                      return (
                        <TableRow key={partner.user_id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{fullName}</TableCell>
                          <TableCell>
                            {partner.shop_links.length === 0 ? (
                              <span className="text-muted-foreground">Brak linków</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {partner.shop_links.map((link) => (
                                  <a
                                    key={link.id}
                                    href={link.shop_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                  >
                                    <LinkIcon className="h-3 w-3" />
                                    {link.shop_name || "Link"}
                                  </a>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{partner.referrals_count}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => openAddLinkDialog(partner.user_id)}
                            >
                              <Plus className="h-3 w-3" />
                              Dodaj link
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Link Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dodaj link do sklepu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">Nazwa sklepu (opcjonalnie)</Label>
                <Input
                  id="shopName"
                  value={newLinkData.shopName}
                  onChange={(e) => setNewLinkData({ ...newLinkData, shopName: e.target.value })}
                  placeholder="np. Sklep suplementów"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopUrl">URL sklepu</Label>
                <Input
                  id="shopUrl"
                  type="url"
                  value={newLinkData.shopUrl}
                  onChange={(e) => setNewLinkData({ ...newLinkData, shopUrl: e.target.value })}
                  placeholder="https://example.com/shop"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleAddLink} disabled={!newLinkData.shopUrl.trim() || isAddingLink}>
                {isAddingLink ? "Dodawanie..." : "Dodaj link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Partners;
