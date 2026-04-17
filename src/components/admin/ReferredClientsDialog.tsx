import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface ReferredClient {
  id: string;
  referred_email: string;
  referred_name: string;
  status: "pending" | "active";
  created_at: string;
}

interface ReferredClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string | null;
  partnerName: string;
}

const isEmailLike = (value: string | null | undefined): boolean => {
  const normalized = (value ?? "").trim();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

const normalizeDisplayName = (value: string | null | undefined): string => {
  const normalized = (value ?? "").trim();
  if (!normalized || isEmailLike(normalized)) return "—";
  return normalized;
};

const ReferredClientsDialog = ({
  open,
  onOpenChange,
  partnerId,
  partnerName,
}: ReferredClientsDialogProps) => {
  const [clients, setClients] = useState<ReferredClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && partnerId) {
      fetchReferredClients();
    }
  }, [open, partnerId]);

  const fetchReferredClients = async () => {
    if (!partnerId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referred_email, referred_name, status, created_at")
        .eq("referrer_user_id", partnerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClients(
        (data || []).map((r) => ({
          id: r.id,
          referred_email: r.referred_email,
          referred_name: r.referred_name,
          status: r.status as "pending" | "active",
          created_at: r.created_at,
        }))
      );
    } catch (error) {
      console.error("[ReferredClientsDialog] Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Klienci poleceni przez: {partnerName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : clients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Ten partner nie ma jeszcze poleconych klientów.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Imię i nazwisko</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Data rejestracji</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {normalizeDisplayName(client.referred_name)}
                    </TableCell>
                    <TableCell>{client.referred_email}</TableCell>
                    <TableCell>
                      {client.created_at
                        ? format(new Date(client.created_at), "d MMM yyyy", { locale: pl })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === "active" ? "default" : "secondary"}
                      >
                        {client.status === "active" ? "Aktywny" : "Oczekujący"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReferredClientsDialog;
