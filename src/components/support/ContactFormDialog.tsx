import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { ACTIVE_PROFILE_STORAGE_KEY } from "@/hooks/usePersonProfiles";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactFormDialog({
  open,
  onOpenChange,
}: ContactFormDialogProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error("Podaj temat wiadomości");
      return;
    }

    if (!message.trim()) {
      toast.error("Napisz treść wiadomości");
      return;
    }

    if (!user?.id) {
      toast.error("Musisz być zalogowany, aby wysłać wiadomość");
      return;
    }

    setIsLoading(true);
    try {
      const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        person_profile_id: activeProfileId || null,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
      });

      if (error) throw error;

      // Pobierz dane profilu dla powiadomienia
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Wyślij powiadomienie email do admina
      await supabase.functions.invoke("send-question-notification", {
        body: {
          type: "support_ticket",
          user_email: user.email || "",
          user_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "",
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      toast.success("Wiadomość została wysłana. Odpowiemy najszybciej jak to możliwe.");
      setSubject("");
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("[ContactFormDialog] Error:", error);
      toast.error(error.message || "Nie udało się wysłać wiadomości");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Skontaktuj się z nami
          </DialogTitle>
          <DialogDescription>
            Wyślij nam wiadomość, a odpowiemy najszybciej jak to możliwe
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Temat</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Czego dotyczy Twoje pytanie?"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Wiadomość</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Opisz szczegółowo swoje pytanie lub problem..."
                className="min-h-[150px]"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wysyłanie...
                </>
              ) : (
                "Wyślij wiadomość"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
