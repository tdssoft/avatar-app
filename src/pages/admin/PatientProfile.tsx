import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

import AdminLayout from "@/components/admin/AdminLayout";
import AdminInterviewView from "@/components/admin/AdminInterviewView";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeDisplayName, resolvePatientDisplayName } from "@/lib/patientDisplayName";
import {
  downloadRecommendationFile as downloadRecommendationFileByLink,
  getRecommendationFileName,
  getRecommendationFileTypeLabel,
  openRecommendationFileInNewTab,
} from "@/lib/recommendationFile";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface PatientData {
  id: string;
  user_id: string;
  subscription_status: string;
  diagnosis_status: string;
  last_communication_at: string | null;
  admin_notes: string | null;
  tags: string[] | null;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface AdminPatientContactResponse {
  email: string | null;
}

interface PersonProfile {
  id: string;
  name: string;
  is_primary: boolean;
  avatar_url: string | null;
}

interface Recommendation {
  id: string;
  recommendation_date: string;
  body_systems: string[];
  diagnosis_summary: string | null;
  pdf_url: string | null;
  created_at: string;
  title: string | null;
  person_profile_id: string | null;
  download_token: string | null;
  token_expires_at: string | null;
}

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  person_profile_id?: string | null;
}

interface Message {
  id: string;
  message_type: string;
  message_text: string;
  sent_at: string | null;
  person_profile_id: string | null;
}

interface PatientFileRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

interface PatientAiEntry {
  id: string;
  content: string;
  attachment_file_name: string | null;
  attachment_file_path: string | null;
  attachment_file_size: number | null;
  attachment_file_type: string | null;
  saved_by_admin_id: string;
  created_at: string;
}

const ADMIN_PATIENT_TABS = ["recommendations", "interview", "audio", "notes", "communication"] as const;
type AdminPatientTab = (typeof ADMIN_PATIENT_TABS)[number];

const normalizeAdminTab = (tab: string | null): AdminPatientTab =>
  ADMIN_PATIENT_TABS.includes((tab ?? "") as AdminPatientTab)
    ? ((tab ?? "recommendations") as AdminPatientTab)
    : "recommendations";

const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [email, setEmail] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [resultFiles, setResultFiles] = useState<PatientFileRecord[]>([]);
  const [deviceFiles, setDeviceFiles] = useState<PatientFileRecord[]>([]);
  const [aiEntries, setAiEntries] = useState<PatientAiEntry[]>([]);
  const [canOpenInterview, setCanOpenInterview] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [newSms, setNewSms] = useState("");
  const [newQuestionReply, setNewQuestionReply] = useState("");
  const [newTag, setNewTag] = useState("");
  const [aiData, setAiData] = useState("");
  const [aiAttachment, setAiAttachment] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isSendingQuestionReply, setIsSendingQuestionReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState<string | null>(null);
  const [isUploadingResultFile, setIsUploadingResultFile] = useState(false);
  const [isUploadingDeviceFile, setIsUploadingDeviceFile] = useState(false);
  const [isSavingAiData, setIsSavingAiData] = useState(false);

  const resultFileInputRef = useRef<HTMLInputElement | null>(null);
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<AdminPatientTab>(() => normalizeAdminTab(searchParams.get("tab")));

  const isDeletingSelf = !!patient?.user_id && !!currentUser?.id && patient.user_id === currentUser.id;

  const getFunctionInvokeErrorMessage = (fnError: unknown): string | null => {
    const err = fnError as any;
    const body = err?.context?.body;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (parsed?.error && typeof parsed.error === "string") return parsed.error;
      } catch {
        // ignore
      }
    }
    if (typeof err?.message === "string" && err.message.trim().length > 0) return err.message;
    return null;
  };

  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

  const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  const getSupabaseErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as { message?: string; error_description?: string; details?: string } | null;
    return err?.message || err?.error_description || err?.details || fallback;
  };

  const validateUploadFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Dozwolone formaty: PDF, JPG, JPEG, PNG");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Maksymalny rozmiar pliku to 20MB");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!id) {
      toast.error("Nieprawidłowy identyfikator pacjenta");
      navigate("/admin", { replace: true });
      return;
    }

    void fetchPatientData();
  }, [id]);

  useEffect(() => {
    const tabFromQuery = normalizeAdminTab(searchParams.get("tab"));
    setActiveTab(tabFromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!id || !selectedProfileId) return;
    void fetchPatientData();
  }, [selectedProfileId]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`admin-patient-realtime-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_result_files", filter: `patient_id=eq.${id}` }, () => {
        void fetchPatientData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_device_files", filter: `patient_id=eq.${id}` }, () => {
        void fetchPatientData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_ai_entries", filter: `patient_id=eq.${id}` }, () => {
        void fetchPatientData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "nutrition_interviews" }, () => {
        void fetchPatientData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, selectedProfileId]);

  const fetchPatientData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (patientError) throw patientError;
      if (!patientData) {
        toast.error("Nie znaleziono pacjenta");
        navigate("/admin", { replace: true });
        return;
      }
      setPatient(patientData);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("user_id", patientData.user_id)
        .maybeSingle();
      if (profileData) setProfile(profileData);
      const { data: contactData, error: contactError } = await supabase.functions.invoke("admin-get-patient-contact", {
        body: { patientId: patientData.id },
      });
      if (contactError) {
        console.error("[PatientProfile] admin-get-patient-contact error", contactError);
        setEmail("");
      } else {
        const contactPayload = contactData as AdminPatientContactResponse | null;
        setEmail(contactPayload?.email?.trim() || "");
      }

      const { data: personProfilesData } = await supabase
        .from("person_profiles")
        .select("id, name, is_primary, avatar_url")
        .eq("account_user_id", patientData.user_id)
        .order("is_primary", { ascending: false });

      let effectiveProfileId = selectedProfileId;
      if (personProfilesData && personProfilesData.length > 0) {
        setPersonProfiles(personProfilesData);
        const primaryProfile = personProfilesData.find((p) => p.is_primary) ?? personProfilesData[0];
        const nextSelected = selectedProfileId && personProfilesData.some((p) => p.id === selectedProfileId)
          ? selectedProfileId
          : primaryProfile.id;
        effectiveProfileId = nextSelected;
        setSelectedProfileId(nextSelected);
      }

      const { data: recsData } = await supabase
        .from("recommendations")
        .select("id, recommendation_date, body_systems, diagnosis_summary, pdf_url, created_at, title, person_profile_id, download_token, token_expires_at")
        .eq("patient_id", id)
        .order("recommendation_date", { ascending: false });

      const recList = recsData || [];
      setRecommendations(recList);
      if (recList.length > 0 && !selectedRecommendationId) {
        setSelectedRecommendationId(recList[0].id);
      }

      const { data: notesData } = await supabase
        .from("patient_notes")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      setNotes(notesData || []);

      const { data: messagesData } = await supabase
        .from("patient_messages")
        .select("*")
        .eq("patient_id", id)
        .order("sent_at", { ascending: false });
      setMessages(messagesData || []);

      if (effectiveProfileId) {
        const [
          { data: resultFilesData, error: resultFilesError },
          { data: deviceFilesData, error: deviceFilesError },
          { data: aiEntriesData, error: aiEntriesError },
          { data: sentInterview },
        ] = await Promise.all([
          supabase
            .from("patient_result_files")
            .select("*")
            .eq("patient_id", id)
            .eq("person_profile_id", effectiveProfileId)
            .order("created_at", { ascending: false }),
          supabase
            .from("patient_device_files")
            .select("*")
            .eq("patient_id", id)
            .eq("person_profile_id", effectiveProfileId)
            .order("created_at", { ascending: false }),
          supabase
            .from("patient_ai_entries")
            .select("*")
            .eq("patient_id", id)
            .eq("person_profile_id", effectiveProfileId)
            .order("created_at", { ascending: false }),
          supabase
            .from("nutrition_interviews")
            .select("id")
            .eq("person_profile_id", effectiveProfileId)
            .eq("status", "sent")
            .limit(1)
            .maybeSingle(),
        ]);

        if (resultFilesError) console.error("[PatientProfile] patient_result_files read error", resultFilesError);
        if (deviceFilesError) console.error("[PatientProfile] patient_device_files read error", deviceFilesError);
        if (aiEntriesError) console.error("[PatientProfile] patient_ai_entries read error", aiEntriesError);
        setResultFiles((resultFilesData as PatientFileRecord[]) || []);
        setDeviceFiles((deviceFilesData as PatientFileRecord[]) || []);
        setAiEntries((aiEntriesData as PatientAiEntry[]) || []);
        setCanOpenInterview(Boolean(sentInterview?.id));
      } else {
        setResultFiles([]);
        setDeviceFiles([]);
        setAiEntries([]);
        setCanOpenInterview(false);
      }
    } catch (error) {
      console.error("[PatientProfile] Error:", error);
      toast.error("Nie udało się załadować danych pacjenta");
    } finally {
      setIsLoading(false);
    }
  };

  const openFileWithSignedUrl = async (bucket: string, filePath: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Nie udało się otworzyć pliku");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const openRecommendationFile = async (fileRef: string) => {
    try {
      await openRecommendationFileInNewTab(fileRef);
    } catch {
      toast.error("Nie udało się otworzyć pliku zalecenia");
    }
  };

  const downloadRecommendationFile = async (fileRef: string) => {
    try {
      await downloadRecommendationFileByLink(fileRef);
    } catch {
      toast.error("Nie udało się pobrać pliku zalecenia");
    }
  };

  const uploadPatientFile = async (
    file: File,
    bucket: "patient-result-files" | "patient-device-files" | "patient-ai-files",
  ): Promise<string | null> => {
    const profileId = selectedProfileId || personProfiles[0]?.id;
    if (!id || !profileId || !currentUser?.id) return null;
    if (!validateUploadFile(file)) return null;

    const safeName = sanitizeFileName(file.name);
    const filePath = `${id}/${profileId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: false });
    if (error) {
      console.error("[PatientProfile] Upload error", { bucket, filePath, error });
      toast.error(getSupabaseErrorMessage(error, "Nie udało się wgrać pliku"));
      return null;
    }
    return filePath;
  };

  const handleResultFileSelected = async (file: File) => {
    const profileId = selectedProfileId || personProfiles[0]?.id;
    if (!id || !profileId || !currentUser?.id) return;
    setIsUploadingResultFile(true);
    try {
      const filePath = await uploadPatientFile(file, "patient-result-files");
      if (!filePath) return;

      const { error } = await supabase.from("patient_result_files").insert({
        patient_id: id,
        person_profile_id: profileId,
        uploaded_by_admin_id: currentUser.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
      });

      if (error) throw error;
      toast.success("Plik wynikowy został zapisany");
      await fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Save result file error", error);
      toast.error(getSupabaseErrorMessage(error, "Nie udało się zapisać pliku wynikowego"));
    } finally {
      setIsUploadingResultFile(false);
    }
  };

  const handleDeviceFileSelected = async (file: File) => {
    const profileId = selectedProfileId || personProfiles[0]?.id;
    if (!id || !profileId || !currentUser?.id) return;
    setIsUploadingDeviceFile(true);
    try {
      const filePath = await uploadPatientFile(file, "patient-device-files");
      if (!filePath) return;

      const { error } = await supabase.from("patient_device_files").insert({
        patient_id: id,
        person_profile_id: profileId,
        uploaded_by_admin_id: currentUser.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
      });

      if (error) throw error;
      toast.success("Plik karty urządzenia został zapisany");
      await fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Save device file error", error);
      toast.error(getSupabaseErrorMessage(error, "Nie udało się zapisać pliku karty urządzenia"));
    } finally {
      setIsUploadingDeviceFile(false);
    }
  };

  const handleDeleteFileRecord = async (
    fileId: string,
    filePath: string,
    bucket: "patient-result-files" | "patient-device-files",
    table: "patient_result_files" | "patient_device_files",
  ) => {
    try {
      await supabase.storage.from(bucket).remove([filePath]);
      const { error } = await supabase.from(table).delete().eq("id", fileId);
      if (error) throw error;
      toast.success("Plik został usunięty");
      await fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Delete file error", error);
      toast.error(getSupabaseErrorMessage(error, "Nie udało się usunąć pliku"));
    }
  };

  const handleSaveAiEntry = async () => {
    const profileId = selectedProfileId || personProfiles[0]?.id;
    if (!id || !profileId || !currentUser?.id || !aiData.trim()) return;
    setIsSavingAiData(true);
    try {
      let attachmentPath: string | null = null;
      if (aiAttachment) {
        attachmentPath = await uploadPatientFile(aiAttachment, "patient-ai-files");
        if (!attachmentPath) {
          setIsSavingAiData(false);
          return;
        }
      }

      const { error } = await supabase.from("patient_ai_entries").insert({
        patient_id: id,
        person_profile_id: profileId,
        saved_by_admin_id: currentUser.id,
        content: aiData.trim(),
        attachment_file_name: aiAttachment?.name ?? null,
        attachment_file_path: attachmentPath,
        attachment_file_size: aiAttachment?.size ?? null,
        attachment_file_type: aiAttachment?.type ?? null,
      });
      if (error) throw error;

      toast.success("Dane AI zostały zapisane");
      setAiData("");
      setAiAttachment(null);
      if (aiFileInputRef.current) aiFileInputRef.current.value = "";
      await fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Save AI entry error", error);
      toast.error(getSupabaseErrorMessage(error, "Nie udało się zapisać danych AI"));
    } finally {
      setIsSavingAiData(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!id) return;
    if (isDeletingSelf) {
      toast.error("Nie możesz usunąć własnego konta");
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { patient_id: id },
      });

      if (error) {
        toast.error(getFunctionInvokeErrorMessage(error) || "Nie udało się usunąć pacjenta");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Pacjent został usunięty");
      navigate("/admin");
    } catch (error) {
      toast.error(getFunctionInvokeErrorMessage(error) || "Nie udało się usunąć pacjenta");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;

    setIsAddingNote(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("patient_notes")
        .insert({
          patient_id: id,
          admin_id: userData.user?.id,
          note_text: newNote.trim(),
          person_profile_id: selectedProfileId || null,
        });

      if (error) throw error;

      toast.success("Notatka została dodana");
      setNewNote("");
      void fetchPatientData();
    } catch {
      toast.error("Nie udało się dodać notatki");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleSendSms = async () => {
    if (!newSms.trim() || !id) return;

    setIsSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-patient-sms", {
        body: {
          patient_id: id,
          person_profile_id: selectedProfileId || null,
          message_text: newSms.trim(),
        },
      });

      if (error) {
        toast.error(getFunctionInvokeErrorMessage(error) || "Nie udało się wysłać SMS");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("SMS został wysłany");
      setNewSms("");
      void fetchPatientData();
    } catch (error) {
      toast.error(getFunctionInvokeErrorMessage(error) || "Nie udało się wysłać SMS");
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSendQuestionReply = async () => {
    if (!newQuestionReply.trim() || !id) return;

    setIsSendingQuestionReply(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-patient-sms", {
        body: {
          patient_id: id,
          person_profile_id: selectedProfileId || null,
          message_text: newQuestionReply.trim(),
        },
      });

      if (error || data?.error) {
        toast.error(getFunctionInvokeErrorMessage(error) || data?.error || "Nie udało się wysłać odpowiedzi");
        return;
      }

      toast.success("Odpowiedź została wysłana");
      setNewQuestionReply("");
      void fetchPatientData();
    } catch {
      toast.error("Nie udało się wysłać odpowiedzi");
    } finally {
      setIsSendingQuestionReply(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !id || !patient) return;

    const currentTags = patient.tags || [];
    if (currentTags.includes(newTag.trim())) {
      toast.error("Ten tag już istnieje");
      return;
    }

    try {
      const { error } = await supabase
        .from("patients")
        .update({ tags: [...currentTags, newTag.trim()] })
        .eq("id", id);

      if (error) throw error;

      setPatient({ ...patient, tags: [...currentTags, newTag.trim()] });
      setNewTag("");
      toast.success("Tag został dodany");
    } catch {
      toast.error("Nie udało się dodać tagu");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!id || !patient) return;

    const currentTags = patient.tags || [];
    const newTags = currentTags.filter((t) => t !== tagToRemove);

    try {
      const { error } = await supabase
        .from("patients")
        .update({ tags: newTags })
        .eq("id", id);

      if (error) throw error;

      setPatient({ ...patient, tags: newTags });
      toast.success("Tag został usunięty");
    } catch {
      toast.error("Nie udało się usunąć tagu");
    }
  };

  const handleRegenerateToken = async (recommendationId: string) => {
    setIsRegeneratingToken(recommendationId);
    try {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);

      const { error } = await supabase
        .from("recommendations")
        .update({
          download_token: crypto.randomUUID(),
          token_expires_at: newExpiryDate.toISOString(),
        })
        .eq("id", recommendationId);

      if (error) throw error;

      toast.success("Token został odnowiony na 7 dni");
      void fetchPatientData();
    } catch {
      toast.error("Nie udało się odnowić tokenu");
    } finally {
      setIsRegeneratingToken(null);
    }
  };

  const isTokenExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getProfileName = (profileId: string | null): string => {
    if (!profileId) return "";
    const pp = personProfiles.find((p) => p.id === profileId);
    return pp?.name || "";
  };

  const firstName = profile?.first_name?.trim() || "";
  const lastName = profile?.last_name?.trim() || "";
  const selectedPersonProfile = personProfiles.find((p) => p.id === selectedProfileId) ?? personProfiles[0] ?? null;
  const selectedProfileAvatarUrl = selectedPersonProfile?.avatar_url || null;
  const primaryPersonProfileName = personProfiles.find((p) => p.is_primary)?.name?.trim() || "";
  const fullName = resolvePatientDisplayName(
    firstName,
    lastName,
    selectedPersonProfile?.name || primaryPersonProfileName || null,
  );

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : "?";

  const filteredRecommendations = selectedProfileId
    ? recommendations.filter((r) => r.person_profile_id === selectedProfileId || !r.person_profile_id)
    : recommendations;

  const selectedRecommendation = filteredRecommendations.find((r) => r.id === selectedRecommendationId) ?? filteredRecommendations[0] ?? null;

  const notesForProfile = selectedProfileId
    ? notes.filter((n) => !n.person_profile_id || n.person_profile_id === selectedProfileId)
    : notes;

  const smsMessages = messages.filter((msg) => msg.message_type === "sms" && (!selectedProfileId || !msg.person_profile_id || msg.person_profile_id === selectedProfileId));
  const questionMessages = messages.filter((msg) => msg.message_type === "question" && (!selectedProfileId || !msg.person_profile_id || msg.person_profile_id === selectedProfileId));

  const formatMessageDate = (dateValue: string | null) =>
    dateValue ? format(new Date(dateValue), "dd.MM.yyyy HH:mm", { locale: pl }) : "Brak daty";
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const setInterviewTab = () => {
    setActiveTab("interview");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "interview");
    setSearchParams(nextParams, { replace: true });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-xl bg-background p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}> 
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Pacjent: {fullName}</h1>
                <p className="text-sm text-muted-foreground">Widok wynikowy i komunikacja pacjenta</p>
              </div>
            </div>

            {personProfiles.length > 1 && (
              <div className="w-full md:w-[280px]">
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz profil" />
                  </SelectTrigger>
                  <SelectContent>
                    {personProfiles.map((pp) => (
                      <SelectItem key={pp.id} value={pp.id}>
                        {(normalizeDisplayName(pp.name) || "—")}{pp.is_primary ? " (główny)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRecommendationId} onValueChange={setSelectedRecommendationId}>
              <SelectTrigger className="w-full md:w-[360px]">
                <SelectValue placeholder="Wybierz zalecenie" />
              </SelectTrigger>
              <SelectContent>
                {filteredRecommendations.length === 0 ? (
                  <SelectItem value="none" disabled>Brak zaleceń</SelectItem>
                ) : (
                  filteredRecommendations.map((rec) => (
                    <SelectItem key={rec.id} value={rec.id}>
                      {rec.title || `Zalecenia z dnia ${format(new Date(rec.recommendation_date), "dd.MM.yyyy", { locale: pl })}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={() => navigate(`/admin/patient/${id}/recommendation/new`)}>
              Dodaj zalecenia
            </Button>
            {selectedRecommendation && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/patient/${id}/recommendation/${selectedRecommendation.id}/edit`)}>
                Edytuj
              </Button>
            )}
            {selectedRecommendation && isTokenExpired(selectedRecommendation.token_expires_at) && (
              <Button size="sm" variant="outline" onClick={() => handleRegenerateToken(selectedRecommendation.id)} disabled={isRegeneratingToken === selectedRecommendation.id}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegeneratingToken === selectedRecommendation.id ? "animate-spin" : ""}`} />
                Odnów token
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Podsumowanie diagnozy i zalecenia dietetyczne</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRecommendation ? (
                  <div className="space-y-3">
                    <p className="font-semibold">{selectedRecommendation.title || "Zalecenie"}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedRecommendation.diagnosis_summary || "Brak opisu diagnozy dla tego zalecenia."}
                    </p>
                    {selectedRecommendation.pdf_url && (
                      <div className="rounded-md border bg-muted/20 p-3">
                        <p className="text-sm font-medium">
                          Plik zalecenia: {getRecommendationFileName(selectedRecommendation.pdf_url)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Typ pliku: {getRecommendationFileTypeLabel(selectedRecommendation.pdf_url)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => void openRecommendationFile(selectedRecommendation.pdf_url!)}>
                            Otwórz plik
                          </Button>
                          <Button size="sm" onClick={() => void downloadRecommendationFile(selectedRecommendation.pdf_url!)}>
                            Pobierz plik
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak zaleceń dla wybranego profilu.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/50 border-2">
              <CardHeader>
                <CardTitle>Pliki wynikowe dla pacjenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resultFiles.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resultFiles.map((file) => (
                      <div key={file.id} className="rounded-md border p-3 text-sm">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-muted-foreground text-xs">{format(new Date(file.created_at), "dd.MM.yyyy HH:mm", { locale: pl })} {file.file_size ? `• ${formatFileSize(file.file_size)}` : ""}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => void openFileWithSignedUrl("patient-result-files", file.file_path)}>
                            Podgląd
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleDeleteFileRecord(file.id, file.file_path, "patient-result-files", "patient_result_files")}
                          >
                            Usuń
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak wgranych plików wynikowych dla tego profilu.</p>
                )}
                <input
                  ref={resultFileInputRef}
                  data-testid="result-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleResultFileSelected(file);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => resultFileInputRef.current?.click()}
                  disabled={isUploadingResultFile}
                >
                  <Upload className="h-4 w-4" />
                  {isUploadingResultFile ? "Wgrywanie..." : "+ wgraj plik"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <h3 className="font-semibold">Karta z urządzenia (dokument wewnętrzny)</h3>
                  {deviceFiles.length > 0 ? (
                    <div className="space-y-2">
                      {deviceFiles.map((file) => (
                        <div key={file.id} className="rounded-md border p-3 text-sm">
                          <p className="font-medium truncate">{file.file_name}</p>
                          <p className="text-muted-foreground text-xs">{format(new Date(file.created_at), "dd.MM.yyyy HH:mm", { locale: pl })} {file.file_size ? `• ${formatFileSize(file.file_size)}` : ""}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => void openFileWithSignedUrl("patient-device-files", file.file_path)}>
                              Podgląd
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleDeleteFileRecord(file.id, file.file_path, "patient-device-files", "patient_device_files")}
                            >
                              Usuń
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">Brak plików</div>
                  )}
                  <input
                    ref={deviceFileInputRef}
                    data-testid="device-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleDeviceFileSelected(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => deviceFileInputRef.current?.click()}
                    disabled={isUploadingDeviceFile}
                  >
                    <Upload className="h-4 w-4" />
                    {isUploadingDeviceFile ? "Wgrywanie..." : "+ wgraj plik"}
                  </Button>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Dane do AI</h3>
                  <Textarea
                    value={aiData}
                    onChange={(e) => setAiData(e.target.value)}
                    placeholder="Wpisz dane pomocnicze dla AI..."
                    className="min-h-[130px]"
                  />
                  <input
                    ref={aiFileInputRef}
                    data-testid="ai-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setAiAttachment(file);
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => aiFileInputRef.current?.click()}>
                      {aiAttachment ? `Plik: ${aiAttachment.name}` : "Dodaj plik AI"}
                    </Button>
                    {aiAttachment && (
                      <Button variant="ghost" onClick={() => {
                        setAiAttachment(null);
                        if (aiFileInputRef.current) aiFileInputRef.current.value = "";
                      }}>
                        Usuń plik
                      </Button>
                    )}
                  </div>
                  <Button onClick={() => void handleSaveAiEntry()} disabled={isSavingAiData || !aiData.trim()}>
                    {isSavingAiData ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Historia danych AI</p>
                    {aiEntries.length > 0 ? (
                      aiEntries.map((entry) => (
                        <div key={entry.id} className="rounded-md border p-3 text-sm space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                          </p>
                          <p className="whitespace-pre-wrap">{entry.content}</p>
                          {entry.attachment_file_path && (
                            <Button size="sm" variant="outline" onClick={() => void openFileWithSignedUrl("patient-ai-files", entry.attachment_file_path!)}>
                              Pobierz załącznik
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Brak zapisanej historii danych AI.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pakiet pacjenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-4 flex items-center justify-between">
                  <span className="font-semibold">Status pakietu</span>
                  <Badge variant={patient?.subscription_status === "Aktywna" ? "default" : "secondary"}>
                    {patient?.subscription_status || "Brak"}
                  </Badge>
                </div>
                <div className="rounded-md border p-4 flex items-center justify-between">
                  <span className="font-semibold">Status diagnozy</span>
                  <Badge variant="secondary">{patient?.diagnosis_status || "Brak"}</Badge>
                </div>
                <Button variant="outline" className="w-full justify-start" onClick={setInterviewTab} disabled={!canOpenInterview}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Zobacz wyniki ankiety (wywiad medyczny)
                </Button>
                {!canOpenInterview && (
                  <p className="text-xs text-muted-foreground">Brak wysłanego wywiadu dla tego profilu.</p>
                )}
              </CardContent>
            </Card>

            {activeTab === "interview" && (
              <Card>
                <CardHeader>
                  <CardTitle>Wywiad medyczny</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedProfileId ? (
                    <AdminInterviewView personProfileId={selectedProfileId} patientId={id || ""} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Wybierz profil, aby zobaczyć wywiad.</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Notatki</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notesForProfile.length > 0 ? (
                  <div className="space-y-3">
                    {notesForProfile.map((note) => (
                      <div key={note.id} className="rounded-md border p-3">
                        <p className="text-sm font-medium">notatka z dnia {format(new Date(note.created_at), "dd/MM/yyyy", { locale: pl })}</p>
                        <p className="text-sm text-muted-foreground">{note.note_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak notatek.</p>
                )}
                <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Dodaj notatkę..." />
                <Button onClick={handleAddNote} disabled={!newNote.trim() || isAddingNote}>{isAddingNote ? "Dodawanie..." : "Dodaj notatkę"}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Komunikacja SMS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {smsMessages.length > 0 ? (
                  <div className="space-y-3">
                    {smsMessages.map((msg) => (
                      <div key={msg.id} className="rounded-md border p-3">
                        <p className="text-sm font-medium">wiadomość z dnia {formatMessageDate(msg.sent_at)}</p>
                        <p className="text-sm text-muted-foreground">{msg.message_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak historii SMS.</p>
                )}
                <Textarea value={newSms} onChange={(e) => setNewSms(e.target.value)} placeholder="Napisz wiadomość SMS do pacjenta..." />
                <Button onClick={handleSendSms} disabled={!newSms.trim() || isSendingSms} className="gap-2">
                  <Send className="h-4 w-4" />
                  {isSendingSms ? "Wysyłanie..." : "Wyślij SMS"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zadane pytania przez formularz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questionMessages.length > 0 ? (
                  <div className="space-y-3">
                    {questionMessages.map((msg) => (
                      <div key={msg.id} className="rounded-md border p-3">
                        <p className="text-sm font-medium">wiadomość z dnia {formatMessageDate(msg.sent_at)}</p>
                        <p className="text-sm text-muted-foreground">{msg.message_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak pytań z formularza.</p>
                )}
                <Textarea value={newQuestionReply} onChange={(e) => setNewQuestionReply(e.target.value)} placeholder="Napisz odpowiedź..." />
                <Button onClick={handleSendQuestionReply} disabled={!newQuestionReply.trim() || isSendingQuestionReply}>
                  {isSendingQuestionReply ? "Wysyłanie..." : "Odpowiedz"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avatar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/20 h-[360px] w-full overflow-hidden flex items-center justify-center">
                  {selectedProfileAvatarUrl ? (
                    <img src={selectedProfileAvatarUrl} alt={fullName} className="h-full w-full object-contain" />
                  ) : (
                    <Avatar className="h-44 w-44">
                      <AvatarFallback className="text-5xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zdjęcie pacjenta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/20 h-[360px] w-full overflow-hidden flex items-center justify-center">
                  {selectedProfileAvatarUrl ? (
                    <img src={selectedProfileAvatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    <Avatar className="h-44 w-44">
                      <AvatarFallback className="text-5xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dane pacjenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Imię i nazwisko:</span>
                    <span>{fullName}</span>
                  </div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{email || "Brak email"}</span></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{profile?.phone || "Brak telefonu"}</span></div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Profile osób</p>
                  <div className="flex flex-wrap gap-2">
                    {personProfiles.map((pp) => (
                      <Badge key={pp.id} variant={pp.id === selectedProfileId ? "default" : "secondary"} className="cursor-pointer" onClick={() => setSelectedProfileId(pp.id)}>
                        {(normalizeDisplayName(pp.name) || "—")}{pp.is_primary ? " ★" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" />Tagi pacjenta</p>
                  <div className="flex flex-wrap gap-2">
                    {(patient?.tags || []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                    {(!patient?.tags || patient.tags.length === 0) && (
                      <p className="text-xs text-muted-foreground">Brak tagów</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Nowy tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddTag(); } }} />
                    <Button variant="outline" size="icon" onClick={handleAddTag}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isDeleting || isDeletingSelf}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Usuwanie..." : isDeletingSelf ? "Nie można usunąć" : "Usuń pacjenta"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno chcesz usunąć tego pacjenta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja jest nieodwracalna. Zostaną usunięte profile, zalecenia, wyniki badań, notatki i wiadomości.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Usuń pacjenta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PatientProfile;
