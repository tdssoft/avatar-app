import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Play, Pause, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AudioRecorderProps {
  personProfileId: string;
  recommendationId?: string;
  interviewId?: string;
  onSaved?: () => void;
  className?: string;
  startButtonLabel?: string;
  notesLabel?: string;
  notesPlaceholder?: string;
  saveButtonLabel?: string;
}

const AudioRecorder = ({
  personProfileId,
  recommendationId,
  interviewId,
  onSaved,
  className,
  startButtonLabel = "Rozpocznij nagrywanie",
  notesLabel = "Notatki do nagrania (opcjonalne)",
  notesPlaceholder = "Dodaj notatki do tego nagrania...",
  saveButtonLabel = "Zapisz nagranie",
}: AudioRecorderProps) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [recordingMimeType, setRecordingMimeType] = useState<string>("audio/webm");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resolveSupportedRecordingType = (): string => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return "audio/webm";
    }

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];

    const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
    return supported || "audio/webm";
  };

  const getExtensionForMimeType = (mimeType: string): string => {
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    return "webm";
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = resolveSupportedRecordingType();
      const recorderOptions = supportedMimeType ? { mimeType: supportedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      setRecordingMimeType(mediaRecorder.mimeType || supportedMimeType || "audio/webm");

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || supportedMimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType });
        if (blob.size === 0) {
          toast.error("Nagranie jest puste. Spróbuj nagrać ponownie.");
          stream.getTracks().forEach((track) => track.stop());
          setAudioBlob(null);
          setAudioUrl(null);
          setDuration(0);
          return;
        }
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Nie można uzyskać dostępu do mikrofonu");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setNotes("");
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const saveRecording = async () => {
    if (!audioBlob || !user) {
      toast.error("Brak nagrania do zapisania");
      return;
    }

    setIsSaving(true);

    try {
      // Generate unique file name
      const timestamp = Date.now();
      const extension = getExtensionForMimeType(recordingMimeType);
      const fileName = `recording_${timestamp}.${extension}`;
      const filePath = `${personProfileId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("audio-recordings")
        .upload(filePath, audioBlob, {
          contentType: recordingMimeType || audioBlob.type || "application/octet-stream",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Nie udało się przesłać nagrania");
      }

      // Save metadata to database
      const { error: dbError } = await supabase.from("audio_recordings").insert({
        person_profile_id: personProfileId,
        recommendation_id: recommendationId || null,
        interview_id: interviewId || null,
        file_path: filePath,
        file_name: fileName,
        duration_seconds: duration,
        recorded_by: user.id,
        notes: notes || null,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Nie udało się zapisać metadanych");
      }

      toast.success("Nagranie zostało zapisane");
      discardRecording();
      onSaved?.();
    } catch (error) {
      console.error("Error saving recording:", error);
      toast.error(error instanceof Error ? error.message : "Błąd podczas zapisywania");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Recording controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording && !audioBlob && (
            <Button
              onClick={startRecording}
              variant="default"
              size="lg"
              className="gap-2 bg-destructive hover:bg-destructive/90"
            >
              <Mic className="h-5 w-5" />
              {startButtonLabel}
            </Button>
          )}

          {isRecording && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                <span className="text-lg font-mono">{formatDuration(duration)}</span>
              </div>
              <Button
                onClick={stopRecording}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Square className="h-5 w-5" />
                Zatrzymaj
              </Button>
            </>
          )}
        </div>

        {/* Playback controls */}
        {audioUrl && (
          <div className="space-y-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />

            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="icon"
                className="h-12 w-12"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              <span className="text-lg font-mono">{formatDuration(duration)}</span>
              <Button
                onClick={discardRecording}
                variant="outline"
                size="icon"
                className="h-12 w-12 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="recording-notes">{notesLabel}</Label>
              <Textarea
                id="recording-notes"
                placeholder={notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Save button */}
            <Button
              onClick={saveRecording}
              disabled={isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Zapisywanie..." : saveButtonLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
