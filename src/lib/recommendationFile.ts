import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "recommendation-files";

const decodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const isAbsoluteFileUrl = (fileRef: string) =>
  fileRef.startsWith("http://") || fileRef.startsWith("https://");

export const getRecommendationFilePath = (fileRef: string): string => {
  if (!fileRef) return "";
  if (!isAbsoluteFileUrl(fileRef)) return fileRef;

  const marker = `/storage/v1/object/${STORAGE_BUCKET}/`;
  const markerPrivate = `/storage/v1/object/private/${STORAGE_BUCKET}/`;
  const markerPublic = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

  if (fileRef.includes(markerPrivate)) return decodePath(fileRef.split(markerPrivate)[1] || "");
  if (fileRef.includes(markerPublic)) return decodePath(fileRef.split(markerPublic)[1] || "");
  if (fileRef.includes(marker)) return decodePath(fileRef.split(marker)[1] || "");

  return "";
};

export const getRecommendationFileName = (fileRef: string | null | undefined): string => {
  if (!fileRef) return "";
  const source = getRecommendationFilePath(fileRef) || fileRef;
  const normalized = source.split("?")[0].split("#")[0];
  const parts = normalized.split("/");
  return decodePath(parts[parts.length - 1] || "");
};

export const getRecommendationFileExtension = (fileRef: string | null | undefined): string => {
  const fileName = getRecommendationFileName(fileRef).toLowerCase();
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.slice(dotIndex + 1);
};

export const getRecommendationFileTypeLabel = (fileRef: string | null | undefined): string => {
  const ext = getRecommendationFileExtension(fileRef);
  if (ext === "pdf") return "PDF";
  if (ext === "doc") return "DOC";
  if (ext === "docx") return "DOCX";
  return ext ? ext.toUpperCase() : "PLIK";
};

export const resolveRecommendationFileUrl = async (fileRef: string): Promise<string> => {
  if (isAbsoluteFileUrl(fileRef)) return fileRef;

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(fileRef, 120);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Nie udało się wygenerować linku do pliku");
  }
  return data.signedUrl;
};

