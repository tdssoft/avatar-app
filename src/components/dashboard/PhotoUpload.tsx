import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadProps {
  className?: string;
}

const PhotoUpload = ({ className }: PhotoUploadProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Check if avatar exists
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .single();
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      }
    };
    fetchUserAndAvatar();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Nieprawidłowy typ pliku",
        description: "Proszę wybrać plik obrazu (JPG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Plik zbyt duży",
        description: "Maksymalny rozmiar pliku to 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Upsert profile with avatar_url
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Sukces",
        description: "Zdjęcie zostało zapisane",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wgrać zdjęcia",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          Twoje zdjęcie
          <Info className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-3">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Twoje zdjęcie"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={handleClick}
          disabled={isUploading}
          className="text-muted-foreground underline underline-offset-4 text-sm font-medium hover:text-foreground disabled:opacity-50"
        >
          {isUploading ? "Wgrywanie..." : "Wgraj swoje zdjęcie"}
        </button>
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;
