import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type RecorderState = "idle" | "recording" | "processing";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopTimer();
        setState("processing");

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        await transcribeAudio(blob, mimeType);
      };

      mediaRecorder.start(250);
      setState("recording");
      startTimer();
    } catch (err) {
      console.error("[VoiceRecorder] Błąd dostępu do mikrofonu:", err);
      setError("Brak dostępu do mikrofonu. Sprawdź uprawnienia w przeglądarce.");
      setState("idle");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError("Brak sesji użytkownika.");
        setState("idle");
        return;
      }

      const ext = mimeType.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("audio", blob, `recording.${ext}`);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/transcribe-audio`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const transcribedText: string = data.text ?? "";

      if (transcribedText.trim()) {
        onTranscription(transcribedText.trim());
      } else {
        setError("Nie udało się rozpoznać mowy. Spróbuj ponownie.");
      }
    } catch (err) {
      console.error("[VoiceRecorder] Błąd transkrypcji:", err);
      setError("Błąd transkrypcji. Spróbuj ponownie.");
    } finally {
      setState("idle");
      setSeconds(0);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {state === "idle" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartRecording}
            className="flex items-center gap-1.5 text-sm border-[#cfcfcf]"
          >
            <Mic className="h-4 w-4" />
            Nagraj odpowiedź głosowo
          </Button>
        )}

        {state === "recording" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStopRecording}
            className="flex items-center gap-1.5 text-sm border-red-400 text-red-600 hover:bg-red-50"
          >
            <MicOff className="h-4 w-4" />
            Zatrzymaj ({formatTime(seconds)})
          </Button>
        )}

        {state === "processing" && (
          <div className="flex items-center gap-1.5 text-sm text-[#8a8a8a]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Trwa transkrypcja...
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

export default VoiceRecorder;
