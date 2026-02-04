import { useState, useEffect } from "react";
import { Plus, Link as LinkIcon, Trash2, Users, UserPlus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReferredClientsDialog from "@/components/admin/ReferredClientsDialog";

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
  
  // State for referred clients dialog
  const [referredDialogOpen, setReferredDialogOpen] = useState(false);
  const [selectedPartnerForReferred, setSelectedPartnerForReferred] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // State for create partner dialog
  const [createPartnerDialogOpen, setCreatePartnerDialogOpen] = useState(false);
  const [newPartnerData, setNewPartnerData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);
  const [createdPartnerInfo, setCreatedPartnerInfo] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

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

      // Show ALL users with referral code (not just those with referrals)
      const partnersData = profiles?.map((p) => ({
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

  const handleDeleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("partner_shop_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast.success("Link został usunięty");
      fetchPartners();
    } catch (error) {
      console.error("[Partners] Error deleting link:", error);
      toast.error("Nie udało się usunąć linku");
    }
  };

  const openAddLinkDialog = (userId: string) => {
    setSelectedPartnerId(userId);
    setDialogOpen(true);
  };

  const openReferredDialog = (partner: Partner) => {
    const fullName = partner.first_name && partner.last_name
      ? `${partner.first_name} ${partner.last_name}`
      : "Nieznany partner";
    
    setSelectedPartnerForReferred({ id: partner.user_id, name: fullName });
    setReferredDialogOpen(true);
  };

  const handleCreatePartner = async () => {
    if (!newPartnerData.firstName.trim() || !newPartnerData.lastName.trim() || !newPartnerData.email.trim()) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    setIsCreatingPartner(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Musisz być zalogowany jako administrator");
        return;
      }

      const response = await supabase.functions.invoke("admin-create-patient", {
        body: {
          firstName: newPartnerData.firstName.trim(),
          lastName: newPartnerData.lastName.trim(),
          email: newPartnerData.email.trim(),
          phone: newPartnerData.phone.trim() || "",
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Nie udało się utworzyć partnera");
      }

      toast.success("Partner został utworzony pomyślnie");
      setCreatedPartnerInfo({
        email: newPartnerData.email.trim(),
        tempPassword: response.data.tempPassword,
      });
      setNewPartnerData({ firstName: "", lastName: "", email: "", phone: "" });
      fetchPartners();
    } catch (error) {
      console.error("[Partners] Error creating partner:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się utworzyć partnera");
    } finally {
      setIsCreatingPartner(false);
    }
  };

  const closeCreatePartnerDialog = () => {
    setCreatePartnerDialogOpen(false);
    setCreatedPartnerInfo(null);
    setNewPartnerData({ firstName: "", lastName: "", email: "", phone: "" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Partnerzy polecający</h1>
            <p className="text-muted-foreground mt-1">
              Zarządzaj partnerami i ich linkami do sklepów
            </p>
          </div>
          <Button onClick={() => setCreatePartnerDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Dodaj partnera
          </Button>
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
                Brak partnerów do wyświetlenia. Partnerzy pojawią się tutaj gdy użytkownicy otrzymają kod polecający.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Imię i nazwisko</TableHead>
                      <TableHead className="font-semibold">Kod polecający</TableHead>
                      <TableHead className="font-semibold">Linki do sklepów</TableHead>
                      <TableHead className="font-semibold">Poleceni klienci</TableHead>
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
                            <Badge variant="outline" className="font-mono">
                              {partner.referral_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {partner.shop_links.length === 0 ? (
                              <span className="text-muted-foreground">Brak linków</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {partner.shop_links.map((link) => (
                                  <div
                                    key={link.id}
                                    className="inline-flex items-center gap-1 text-sm bg-muted/50 rounded px-2 py-1"
                                  >
                                    <a
                                      href={link.shop_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                      {link.shop_name || "Link"}
                                    </a>
                                    <button
                                      onClick={() => handleDeleteLink(link.id)}
                                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                      title="Usuń link"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{partner.referrals_count}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => openAddLinkDialog(partner.user_id)}
                              >
                                <Plus className="h-3 w-3" />
                                Dodaj link
                              </Button>
                              {partner.referrals_count > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openReferredDialog(partner)}
                                >
                                  <Users className="h-3 w-3" />
                                  Zobacz poleconych
                                </Button>
                              )}
                            </div>
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

        {/* Referred Clients Dialog */}
        <ReferredClientsDialog
          open={referredDialogOpen}
          onOpenChange={setReferredDialogOpen}
          partnerId={selectedPartnerForReferred?.id || null}
          partnerName={selectedPartnerForReferred?.name || ""}
        />

        {/* Create Partner Dialog */}
        <Dialog open={createPartnerDialogOpen} onOpenChange={closeCreatePartnerDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dodaj nowego partnera</DialogTitle>
              <DialogDescription>
                Utwórz konto dla nowego partnera polecającego
              </DialogDescription>
            </DialogHeader>
            
            {createdPartnerInfo ? (
              <div className="space-y-4">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-primary font-medium mb-2">Partner utworzony pomyślnie!</p>
                  <p className="text-sm text-muted-foreground">
                    Przekaż partnerowi następujące dane logowania:
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{createdPartnerInfo.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tymczasowe hasło</Label>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{createdPartnerInfo.tempPassword}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={closeCreatePartnerDialog}>Zamknij</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partnerFirstName">Imię *</Label>
                      <Input
                        id="partnerFirstName"
                        value={newPartnerData.firstName}
                        onChange={(e) => setNewPartnerData({ ...newPartnerData, firstName: e.target.value })}
                        placeholder="Jan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerLastName">Nazwisko *</Label>
                      <Input
                        id="partnerLastName"
                        value={newPartnerData.lastName}
                        onChange={(e) => setNewPartnerData({ ...newPartnerData, lastName: e.target.value })}
                        placeholder="Kowalski"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerEmail">Email *</Label>
                    <Input
                      id="partnerEmail"
                      type="email"
                      value={newPartnerData.email}
                      onChange={(e) => setNewPartnerData({ ...newPartnerData, email: e.target.value })}
                      placeholder="partner@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerPhone">Telefon (opcjonalnie)</Label>
                    <Input
                      id="partnerPhone"
                      type="tel"
                      value={newPartnerData.phone}
                      onChange={(e) => setNewPartnerData({ ...newPartnerData, phone: e.target.value })}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeCreatePartnerDialog}>
                    Anuluj
                  </Button>
                  <Button 
                    onClick={handleCreatePartner} 
                    disabled={!newPartnerData.firstName.trim() || !newPartnerData.lastName.trim() || !newPartnerData.email.trim() || isCreatingPartner}
                  >
                    {isCreatingPartner ? "Tworzenie..." : "Utwórz partnera"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Partners;
