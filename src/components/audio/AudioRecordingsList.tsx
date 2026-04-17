import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Trash2, Mic, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AudioRecording {
  id: string;
  file_path: string;
  file_name: string;
  duration_seconds: number | null;
  recorded_at: string;
  notes: string | null;
}

interface AudioRecordingsListProps {
  personProfileId: string;
  recommendationId?: string;
  interviewId?: string;
  className?: string;
  refreshTrigger?: number;
}

const AudioRecordingsList = ({
  personProfileId,
  recommendationId,
  interviewId,
  className,
  refreshTrigger,
}: AudioRecordingsListProps) => {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, [personProfileId, recommendationId, interviewId, refreshTrigger]);

  const fetchRecordings = async () => {
    setIsLoading(true);

    let query = supabase
      .from("audio_recordings")
      .select("id, file_path, file_name, duration_seconds, recorded_at, notes")
      .eq("person_profile_id", personProfileId)
      .order("recorded_at", { ascending: false });

    if (recommendationId) {
      query = query.eq("recommendation_id", recommendationId);
    }

    if (interviewId) {
      query = query.eq("interview_id", interviewId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching recordings:", error);
    } else {
      setRecordings(data || []);
    }

    setIsLoading(false);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlay = async (recording: AudioRecording) => {
    // Stop if already playing this one
    if (playingId === recording.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      // Get signed URL for playback
      const { data, error } = await supabase.storage
        .from("audio-recordings")
        .createSignedUrl(recording.file_path, 3600);

      if (error) {
        throw error;
      }

      // Create and play audio
      const audio = new Audio(data.signedUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
      };

      audio.onerror = () => {
        toast.error("Nie udało się odtworzyć nagrania");
        setPlayingId(null);
      };

      await audio.play();
      setPlayingId(recording.id);
    } catch (error) {
      console.error("Error playing recording:", error);
      toast.error("Nie udało się odtworzyć nagrania");
    }
  };

  const handleDelete = async (recording: AudioRecording) => {
    setDeletingId(recording.id);

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("audio-recordings")
        .remove([recording.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue anyway - file might already be deleted
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("audio_recordings")
        .delete()
        .eq("id", recording.id);

      if (dbError) {
        throw dbError;
      }

      toast.success("Nagranie zostało usunięte");
      setRecordings((prev) => prev.filter((r) => r.id !== recording.id));
    } catch (error) {
      console.error("Error deleting recording:", error);
      toast.error("Nie udało się usunąć nagrania");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 text-muted-foreground">
          <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Brak nagrań audio</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {recordings.map((recording) => (
        <Card key={recording.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePlay(recording)}
                  className="shrink-0"
                >
                  {playingId === recording.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono">
                      {formatDuration(recording.duration_seconds)}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground truncate">
                      {format(new Date(recording.recorded_at), "d MMM yyyy, HH:mm", {
                        locale: pl,
                      })}
                    </span>
                  </div>
                  {recording.notes && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {recording.notes}
                    </p>
                  )}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    disabled={deletingId === recording.id}
                  >
                    {deletingId === recording.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usuń nagranie</AlertDialogTitle>
                    <AlertDialogDescription>
                      Czy na pewno chcesz usunąć to nagranie? Ta operacja jest nieodwracalna.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(recording)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Usuń
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AudioRecordingsList;
