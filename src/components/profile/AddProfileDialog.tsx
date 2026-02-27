import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersonProfiles } from "@/hooks/usePersonProfiles";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProfileDialog({ open, onOpenChange }: AddProfileDialogProps) {
  const { createProfile } = usePersonProfiles();
  const { hasPaidPlan } = useUserFlowStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      birth_date: "",
      gender: undefined,
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createProfile({
        name: data.name,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        notes: data.notes || null,
      }, {
        setAsActive: true,
      });

      if (result) {
        form.reset();
        onOpenChange(false);
        const { data: accessRow, error: accessError } = await supabase
          .from("profile_access")
          .select("id")
          .eq("person_profile_id", result.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (accessError) {
          console.error("[AddProfileDialog] profile_access check failed", accessError);
        }

        if (hasPaidPlan && accessRow?.id) {
          navigate("/interview");
        } else {
          toast({
            title: "Profil dodany",
            description: "Ten profil wymaga osobnego pakietu. Najpierw aktywuj pakiet dla tego profilu.",
          });
          navigate("/dashboard", { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj nowy profil</DialogTitle>
          <DialogDescription>
            Dodaj profil dla dziecka lub innej osoby, której dane chcesz śledzić
            na tym koncie.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Jan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data urodzenia</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Płeć</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz płeć" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Mężczyzna</SelectItem>
                      <SelectItem value="female">Kobieta</SelectItem>
                      <SelectItem value="other">Inna</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe informacje..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Dodaj profil
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
