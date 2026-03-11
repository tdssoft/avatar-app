export type AudioRecordingScope = "all" | "standalone";

export const shouldFilterStandaloneAudio = (scope: AudioRecordingScope | undefined) =>
  scope === "standalone";
