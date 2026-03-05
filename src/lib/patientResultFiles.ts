import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_PROFILE_STORAGE_KEY } from "@/hooks/usePersonProfiles";

export interface PatientResultFileRecord {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  file_size: number | null;
  file_type: string | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const hasAllowedExtension = (name: string) =>
  ALLOWED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

export const validatePatientResultFile = (file: File): string | null => {
  if (!ALLOWED_MIME_TYPES.includes(file.type) && !hasAllowedExtension(file.name)) {
    return "Dozwolone formaty: PDF, JPG, PNG, DOC, DOCX";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Maksymalny rozmiar pliku to 20MB";
  }

  return null;
};

export interface PatientResultContext {
  patientId: string;
  activeProfileId: string;
}

export const getPatientResultContext = async (userId: string): Promise<PatientResultContext> => {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (patientError || !patient?.id) {
    throw new Error("Nie znaleziono profilu pacjenta");
  }

  const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  if (!activeProfileId) {
    throw new Error("Brak aktywnego profilu osoby");
  }

  const { data: profile, error: profileError } = await supabase
    .from("person_profiles")
    .select("id")
    .eq("id", activeProfileId)
    .eq("account_user_id", userId)
    .maybeSingle();

  if (profileError || !profile?.id) {
    throw new Error("Aktywny profil osoby jest nieprawidłowy");
  }

  return {
    patientId: patient.id,
    activeProfileId,
  };
};

export const fetchPatientResultFilesForActiveProfile = async (
  userId: string,
): Promise<PatientResultFileRecord[]> => {
  const { patientId, activeProfileId } = await getPatientResultContext(userId);

  const { data, error } = await supabase
    .from("patient_result_files")
    .select("id, file_name, file_path, created_at, file_size, file_type")
    .eq("patient_id", patientId)
    .eq("person_profile_id", activeProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PatientResultFileRecord[];
};

export const uploadPatientResultFileForActiveProfile = async (
  userId: string,
  file: File,
): Promise<PatientResultFileRecord> => {
  const { patientId, activeProfileId } = await getPatientResultContext(userId);

  const safeName = sanitizeFileName(file.name);
  const filePath = `${patientId}/${activeProfileId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("patient-result-files")
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: insertError } = await supabase
    .from("patient_result_files")
    .insert({
      patient_id: patientId,
      person_profile_id: activeProfileId,
      uploaded_by_admin_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type || null,
    })
    .select("id, file_name, file_path, created_at, file_size, file_type")
    .single();

  if (insertError || !data) {
    throw insertError || new Error("Nie udało się zapisać metadanych pliku");
  }

  return data as PatientResultFileRecord;
};

export const createPatientResultFileSignedUrl = async (filePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("patient-result-files")
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    throw error || new Error("Nie udało się otworzyć pliku");
  }

  return data.signedUrl;
};
