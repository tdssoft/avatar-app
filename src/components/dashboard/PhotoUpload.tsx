import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ACTIVE_PROFILE_CHANGED_EVENT, ACTIVE_PROFILE_STORAGE_KEY } from "@/hooks/usePersonProfiles";

interface PhotoUploadProps {
  className?: string;
  title?: string;
  actionLabel?: string;
  imageClassName?: string;
  editable?: boolean;
  onAction?: () => void;
}

const PhotoUpload = ({
  className,
  title = "Twój profil",
  actionLabel = "Zmień zdjęcie",
  imageClassName,
  editable = true,
  onAction,
}: PhotoUploadProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusVariant, setStatusVariant] = useState<"default" | "error">("default");
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const activeProfileIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [captureMode, setCaptureMode] = useState<"idle" | "camera">("idle");
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchProfileAvatar = async (profileId: string) => {
    const { data, error } = await supabase
      .from("person_profiles")
      .select("avatar_url")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      console.error("[PhotoUpload] fetch avatar error:", error);
      return;
    }

    setAvatarUrl(data?.avatar_url ?? null);
    setPreviewUrl(null);
  };

  useEffect(() => {
    const fetchUserAndAvatar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const storedProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
        if (!storedProfileId) {
          setAvatarUrl(null);
          return;
        }
        setActiveProfileId(storedProfileId);
        activeProfileIdRef.current = storedProfileId;
        await fetchProfileAvatar(storedProfileId);
      }
    };

    fetchUserAndAvatar();

    const onAvatarUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarUrl?: string; profileId?: string }>;
      const targetProfileId = customEvent.detail?.profileId;
      if (customEvent.detail?.avatarUrl && targetProfileId === activeProfileIdRef.current) {
        setAvatarUrl(customEvent.detail.avatarUrl);
      }
    };

    const onActiveProfileChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ profileId?: string }>;
      const nextProfileId = customEvent.detail?.profileId;
      if (!nextProfileId) return;
      setActiveProfileId(nextProfileId);
      activeProfileIdRef.current = nextProfileId;
      void fetchProfileAvatar(nextProfileId);
    };

    window.addEventListener("avatar-updated", onAvatarUpdated);
    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onActiveProfileChanged);
    return () => {
      window.removeEventListener("avatar-updated", onAvatarUpdated);
      window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onActiveProfileChanged);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatusMessage("");
    setStatusVariant("default");

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setStatusMessage("Dozwolone formaty: JPG, PNG, WEBP");
      setStatusVariant("error");
      toast({
        title: "Nieprawidłowy typ pliku",
        description: "Dozwolone formaty: JPG, PNG, WEBP",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setStatusMessage("Maksymalny rozmiar pliku to 20MB");
      setStatusVariant("error");
      toast({
        title: "Plik zbyt duży",
        description: "Maksymalny rozmiar pliku to 20MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let currentUserId = userId;
      let currentProfileId = activeProfileIdRef.current || activeProfileId || localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
      if (!currentUserId) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("Brak aktywnej sesji użytkownika");
        }
        currentUserId = user.id;
        setUserId(user.id);
      }
      if (!currentProfileId) {
        throw new Error("Brak aktywnego profilu");
      }

      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `${currentUserId}/${currentProfileId}/avatar.${fileExt.toLowerCase()}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update active person profile with avatar_url
      const { error: profileError } = await supabase
        .from("person_profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentProfileId)
        .eq("account_user_id", currentUserId);

      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      setPreviewUrl(null);
      setStatusMessage("Zdjęcie zostało zapisane.");
      setStatusVariant("default");
      window.dispatchEvent(
        new CustomEvent("avatar-updated", {
          detail: { avatarUrl: publicUrl, profileId: currentProfileId },
        }),
      );

      toast({
        title: "Sukces",
        description: "Zdjęcie zostało zapisane",
      });
    } catch (error) {
      console.error("Upload error:", error);
      const description =
        error instanceof Error ? error.message : "Nie udało się wgrać zdjęcia";
      setPreviewUrl(null);
      setStatusMessage(description);
      setStatusVariant("error");
      toast({
        title: "Błąd",
        description,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      streamRef.current = stream;
      setVideoReady(false);
      setCaptureMode("camera");
      // videoRef.srcObject is set in useEffect after captureMode changes
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Brak dostępu do kamery",
        description: "Sprawdź uprawnienia przeglądarki lub wybierz zdjęcie z urządzenia.",
        variant: "destructive"
      });
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoReady(false);
    setCaptureMode("idle");
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      toast({
        title: "Kamera nie jest gotowa",
        description: "Poczekaj chwilę i spróbuj ponownie.",
        variant: "destructive",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob || blob.size < 100) {
        toast({
          title: "Błąd zdjęcia",
          description: "Nie udało się uchwycić klatki. Spróbuj ponownie.",
          variant: "destructive",
        });
        return;
      }
      const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
      stopCamera();
      const syntheticEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      void handleFileSelect(syntheticEvent);
    }, "image/jpeg", 0.92);
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (captureMode === "camera" && video && streamRef.current) {
      video.srcObject = streamRef.current;
      const onReady = () => setVideoReady(true);
      video.addEventListener("loadedmetadata", onReady);
      // If metadata already loaded (e.g. stream was re-attached)
      if (video.readyState >= 1) setVideoReady(true);
      return () => {
        video.removeEventListener("loadedmetadata", onReady);
      };
    }
  }, [captureMode]);

  const handleClick = () => {
    if (!editable) {
      onAction?.();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          {title}
          <Info className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="w-full max-w-[220px] aspect-[4/5] rounded-md bg-muted flex items-center justify-center overflow-hidden mb-4">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (previewUrl || avatarUrl) ? (
            <img
              src={previewUrl || avatarUrl || ""}
              alt={title}
              className={`w-full h-full object-cover bg-black/5 ${imageClassName || ""}`}
              onError={() => {
                setPreviewUrl(null);
                setStatusMessage("Nie można wyświetlić tego formatu zdjęcia. Użyj JPG/PNG/WEBP.");
                setStatusVariant("error");
              }}
            />
          ) : (
            <Camera className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
        {captureMode === "idle" ? (
          <>
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm mb-2 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              Zrób zdjęcie kamerką
            </button>
            <button
              onClick={handleClick}
              disabled={isUploading}
              className="text-muted-foreground underline underline-offset-4 text-sm font-medium hover:text-foreground disabled:opacity-50"
            >
              {isUploading ? "Wgrywanie..." : actionLabel}
            </button>
          </>
        ) : (
          <div className="space-y-2 w-full">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!videoReady}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
              >
                {videoReady ? "Zrób zdjęcie" : "Ładowanie kamery..."}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 bg-secondary rounded text-sm"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
        {statusMessage ? (
          <p
            className={`mt-2 text-xs ${
              statusVariant === "error" ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;
