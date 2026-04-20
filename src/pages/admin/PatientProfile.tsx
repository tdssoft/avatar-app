import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  PenLine,
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
  Loader2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";

import AdminLayout from "@/components/admin/AdminLayout";
import { allPackages } from "@/lib/paymentFlow";
import AdminInterviewView from "@/components/admin/AdminInterviewView";
import {
  invokeAdminGrantAccess,
  resolveGrantAccessErrorMessage,
  formatGrantAccessSuccessMessage,
} from "@/lib/adminGrantAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeDisplayName, resolvePatientDisplayName } from "@/lib/patientDisplayName";
import {
  downloadRecommendationFile as downloadRecommendationFileByLink,
  getRecommendationFileName,
  getRecommendationFileTypeLabel,
  resolveRecommendationFileUrl,
} from "@/lib/recommendationFile";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import FileViewerModal from "@/components/ui/FileViewerModal";
import VoiceRecorder from "@/components/interview/VoiceRecorder";

interface PatientData {
  id: string;
  user_id: string;
  subscription_status: string;
  diagnosis_status: string;
  last_communication_at: string | null;
  admin_notes: string | null;
  tags: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  is_draft?: boolean;
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

interface PaymentHistoryRecord {
  id: string;
  person_profile_id: string;
  profile_name: string | null;
  status: string;
  source: string;
  // resolved display fields
  source_label: string;
  product_name: string | null;
  reason_label: string | null;
  // raw fields
  selected_packages: string | null;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  activated_at: string | null;
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRecord[]>([]);

  const [activateProfileId, setActivateProfileId] = useState("");
  const [activateReason, setActivateReason] = useState("");
  const [activateProductId, setActivateProductId] = useState("");
  const [isActivatingProfile, setIsActivatingProfile] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [newSms, setNewSms] = useState("");
  const [newQuestionReply, setNewQuestionReply] = useState("");
  const [newTag, setNewTag] = useState("");
  const [aiData, setAiData] = useState("");
  const [aiAttachment, setAiAttachment] = useState<File | null>(null);
  const [deviceCardText, setDeviceCardText] = useState("");

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isSendingQuestionReply, setIsSendingQuestionReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState<string | null>(null);
  const [isUploadingResultFile, setIsUploadingResultFile] = useState(false);
  const [isUploadingDeviceFile, setIsUploadingDeviceFile] = useState(false);
  const [isSavingAiData, setIsSavingAiData] = useState(false);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);

  // General file viewer modal state (for patient result/device files)
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileViewerUrl, setFileViewerUrl] = useState<string | null>(null);
  const [fileViewerName, setFileViewerName] = useState("");
  const [fileViewerLoading, setFileViewerLoading] = useState(false);
  const [fileViewerDownloadFn, setFileViewerDownloadFn] = useState<(() => void) | undefined>(undefined);

  const resultFileInputRef = useRef<HTMLInputElement | null>(null);
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<AdminPatientTab>(() => normalizeAdminTab(searchParams.get("tab")));

  const isDeletingSelf = !!patient?.user_id && !!currentUser?.id && patient.user_id === currentUser.id;

  // ---------------------------------------------------------------------------
  // TanStack Query — consolidated RPC fetches (13 HTTP requests → 2)
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();

  // RPC #1: core patient data (patient + profile + email + person_profiles +
  //         profile_access + admin_access_grants + recommendations + notes + messages)
  const { data: _coreRaw, isLoading: isCoreLoading, isError: isCoreError, error: coreError } = useQuery({
    queryKey: ["admin-patient-core", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.rpc("get_admin_patient_core", { p_patient_id: id });
      if (error) throw error;
      if (data === null) throw new Error("NOT_FOUND");
      return data;
    },
    staleTime: 2 * 60 * 1000,  // data stays fresh for 2 minutes
    gcTime:   10 * 60 * 1000,  // kept in memory for 10 minutes after unmount
    enabled: !!id,
    retry: 1,
  });

  // RPC #2: profile-specific data (result_files + device_files + ai_entries + can_open_interview)
  const { data: _profileRaw, isLoading: isProfileLoading } = useQuery({
    queryKey: ["admin-patient-profile", id, selectedProfileId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_patient_profile_data", {
        p_patient_id: id!,
        p_person_profile_id: selectedProfileId,
      });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime:   10 * 60 * 1000,
    enabled: !!id && !!selectedProfileId,
  });

  // Derived loading state: show spinner while core data is loading for the first time
  const isLoading = isCoreLoading;

  // ---------------------------------------------------------------------------
  // Navigate away if patient not found or access error
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      toast.error("Nieprawidłowy identyfikator pacjenta");
      navigate("/admin", { replace: true });
    }
  }, [id]);

  useEffect(() => {
    if (!isCoreError) return;
    const isNotFound = (coreError as Error)?.message === "NOT_FOUND";
    toast.error(isNotFound ? "Nie znaleziono pacjenta" : "Nie udało się załadować danych pacjenta");
    navigate("/admin", { replace: true });
  }, [isCoreError]);

  // ---------------------------------------------------------------------------
  // Sync URL ?tab= param to activeTab state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const tabFromQuery = normalizeAdminTab(searchParams.get("tab"));
    setActiveTab(tabFromQuery);
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Process core RPC data into existing state variables
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!_coreRaw) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = _coreRaw as any;

    setPatient(d.patient ?? null);
    setProfile(d.profile ?? null);
    setEmail((d.email as string | null)?.trim() ?? "");

    const profilesData: PersonProfile[] = (d.person_profiles as PersonProfile[]) ?? [];
    setPersonProfiles(profilesData);

    const recList: Recommendation[] = (d.recommendations as Recommendation[]) ?? [];
    setRecommendations(recList);
    setSelectedRecommendationId((prev) => prev || (recList.length > 0 ? recList[0].id : ""));

    setNotes((d.notes as Note[]) ?? []);
    setMessages((d.messages as Message[]) ?? []);

    // Process payment history (identical logic to the old fetchPatientData)
    try {
      const resolveSourceLabel = (source: string) => {
        if (source === "stripe") return "Stripe (online)";
        if (source === "cash" || source === "platnosc_gotowka") return "Gotówka";
        if (source === "admin") return "Nadana przez admina";
        if (source === "manual") return "Przypisana ręcznie";
        if (source === "inny_przypadek") return "Inny przypadek";
        return source || "—";
      };
      const resolveReasonLabel = (reason: string | null) => {
        if (!reason) return null;
        if (reason === "platnosc_gotowka") return "Płatność gotówką";
        if (reason === "inny_przypadek") return "Inny przypadek";
        return reason;
      };
      const resolveProductName = (pkgIds: string | null, fallbackName?: string) => {
        if (fallbackName) return fallbackName;
        if (!pkgIds) return null;
        const ids = pkgIds.split(",").map((p) => p.trim()).filter(Boolean);
        const names = ids.map((pkgId) => {
          const found = allPackages.find((p) => p.id === pkgId);
          return found ? `${found.name} (${found.price} zł${found.billing === "monthly" ? "/mies." : ""})` : pkgId;
        });
        return names.length > 0 ? names.join(", ") : null;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paRows: any[] = (d.profile_access as any[]) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agRows: any[] = (d.admin_access_grants as any[]) ?? [];
      const patientData: PatientData | null = d.patient ?? null;

      // Include ALL profile_access records (stripe + admin) so sub-profiles
      // activated via admin show as "Aktywny" (not just stripe-sourced ones)
      const stripeRecords: PaymentHistoryRecord[] = paRows
        .map((pa) => ({
          id: pa.id,
          person_profile_id: pa.person_profile_id,
          profile_name: profilesData.find((p) => p.id === pa.person_profile_id)?.name ?? null,
          status: pa.status,
          source: pa.source,
          source_label: resolveSourceLabel(pa.source),
          product_name: resolveProductName(pa.selected_packages ?? null),
          reason_label: null,
          selected_packages: pa.selected_packages ?? null,
          stripe_session_id: pa.stripe_session_id ?? null,
          stripe_subscription_id: pa.stripe_subscription_id ?? null,
          activated_at: pa.activated_at ?? null,
          created_at: pa.activated_at || pa.created_at || new Date().toISOString(),
        }));

      const adminGrantRecords: PaymentHistoryRecord[] = agRows.map((g) => ({
        id: String(g.id ?? "grant-" + Math.random()),
        person_profile_id: "",
        profile_name: null,
        status: "active",
        source: "admin",
        source_label: resolveSourceLabel("admin"),
        product_name: resolveProductName(String(g.product_id ?? ""), String(g.product_name ?? "")),
        reason_label: resolveReasonLabel(String(g.reason ?? "")),
        selected_packages: g.product_id ? String(g.product_id) : null,
        stripe_session_id: null,
        stripe_subscription_id: null,
        activated_at: g.granted_at ? String(g.granted_at) : null,
        created_at: g.granted_at ? String(g.granted_at) : new Date().toISOString(),
      }));

      let combined = [...adminGrantRecords, ...stripeRecords].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (combined.length === 0 && patientData?.subscription_status === "Aktywna") {
        combined = [{
          id: "manual-fallback",
          person_profile_id: "",
          profile_name: null,
          status: "active",
          source: "manual",
          source_label: "Przypisana ręcznie",
          product_name: null,
          reason_label: null,
          selected_packages: null,
          stripe_session_id: null,
          stripe_subscription_id: null,
          activated_at: patientData.updated_at ?? null,
          created_at: patientData.updated_at || patientData.created_at || new Date().toISOString(),
        }];
      }

      setPaymentHistory(combined);
    } catch (paymentErr) {
      console.error("[PatientProfile] payment history processing error:", paymentErr);
      const patientData: PatientData | null = d.patient ?? null;
      if (patientData?.subscription_status === "Aktywna") {
        setPaymentHistory([{
          id: "fallback-error",
          person_profile_id: "",
          profile_name: null,
          status: "active",
          source: "manual",
          source_label: "Przypisana ręcznie",
          product_name: null,
          reason_label: null,
          selected_packages: null,
          stripe_session_id: null,
          stripe_subscription_id: null,
          activated_at: null,
          created_at: new Date().toISOString(),
        }]);
      }
    }

    // Auto-select primary profile (stable: won't change if user already selected one)
    if (profilesData.length > 0) {
      const primary = profilesData.find((p) => p.is_primary) ?? profilesData[0];
      setSelectedProfileId((prev) => {
        if (prev && profilesData.some((p) => p.id === prev)) return prev;
        return primary.id;
      });
    }
  }, [_coreRaw]);

  // ---------------------------------------------------------------------------
  // Sync profile-specific RPC data into state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!_profileRaw) {
      // Only clear if not currently loading (avoid clearing while first fetch is in-flight)
      if (!isProfileLoading) {
        setResultFiles([]);
        setDeviceFiles([]);
        setAiEntries([]);
        setCanOpenInterview(false);
      }
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = _profileRaw as any;
    setResultFiles((d.result_files as PatientFileRecord[]) ?? []);
    setDeviceFiles((d.device_files as PatientFileRecord[]) ?? []);
    setAiEntries((d.ai_entries as PatientAiEntry[]) ?? []);
    setCanOpenInterview(Boolean(d.can_open_interview));
  }, [_profileRaw, isProfileLoading]);

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
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const ALLOWED_EXTENSIONS: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  const getSupabaseErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as { message?: string; error_description?: string; details?: string } | null;
    return err?.message || err?.error_description || err?.details || fallback;
  };

  const resolveContentType = (file: File): string => {
    if (file.type) return file.type;
    const ext = ("." + file.name.split(".").pop()?.toLowerCase()) as string;
    return ALLOWED_EXTENSIONS[ext] || "application/octet-stream";
  };

  const validateUploadFile = (file: File): boolean => {
    const contentType = resolveContentType(file);
    if (!ALLOWED_TYPES.includes(contentType)) {
      toast.error("Dozwolone formaty: PDF, JPG, JPEG, PNG, DOC, DOCX");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Maksymalny rozmiar pliku to 20MB");
      return false;
    }
    return true;
  };

  const openFileWithSignedUrl = async (bucket: string, filePath: string, displayName?: string) => {
    const name = displayName || filePath.split("/").pop() || "Plik";
    setFileViewerName(name);
    setFileViewerUrl(null);
    setFileViewerLoading(true);
    setFileViewerOpen(true);
    setFileViewerDownloadFn(undefined);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Nie udało się otworzyć pliku");
      setFileViewerOpen(false);
      setFileViewerLoading(false);
      return;
    }
    const signedUrl = data.signedUrl;
    setFileViewerUrl(signedUrl);
    setFileViewerDownloadFn(() => () => {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = name;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
    setFileViewerLoading(false);
  };

  const downloadFileWithSignedUrl = async (bucket: string, filePath: string, displayName?: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Nie udało się pobrać pliku");
      return;
    }
    const name = displayName || filePath.split("/").pop() || "plik";
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = name;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openRecommendationFile = async (fileRef: string) => {
    const name = getRecommendationFileName(fileRef) || "Podgląd pliku";
    setFileViewerName(name);
    setFileViewerUrl(null);
    setFileViewerLoading(true);
    setFileViewerOpen(true);
    setFileViewerDownloadFn(undefined);
    try {
      const signedUrl = await resolveRecommendationFileUrl(fileRef);
      setFileViewerUrl(signedUrl);
      setFileViewerDownloadFn(() => () => void downloadRecommendationFile(fileRef));
    } catch {
      setFileViewerOpen(false);
      toast.error("Nie udało się otworzyć pliku zalecenia");
    } finally {
      setFileViewerLoading(false);
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
    const contentType = resolveContentType(file);
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: false, contentType });
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
      await queryClient.invalidateQueries({ queryKey: ["admin-patient-profile", id, selectedProfileId] });
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
      try {
        const text = await file.text();
        if (text.trim()) setDeviceCardText(text.trim());
      } catch {
        // binary file — admin types manually
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-patient-profile", id, selectedProfileId] });
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
      await queryClient.invalidateQueries({ queryKey: ["admin-patient-profile", id, selectedProfileId] });
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
      await queryClient.invalidateQueries({ queryKey: ["admin-patient-profile", id, selectedProfileId] });
    } catch (error) {
      console.error("[PatientProfile] Save AI entry error", error);
      toast.error(getSupabaseErrorMessage(error, "Nie udało się zapisać danych AI"));
    } finally {
      setIsSavingAiData(false);
    }
  };

  const handleGenerateFromAiData = async () => {
    if (!aiData.trim()) return;
    setIsGeneratingRecommendation(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendation-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ notes: aiData, isFollowUp: false }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      navigate(
        `/admin/patient/${id}/recommendation/new${selectedProfileId ? `?profileId=${selectedProfileId}` : ""}`,
        {
          state: {
            prefillData: {
              diagnosisSummary: result.diagnosis_summary || "",
              dietaryRecommendations: result.dietary_recommendations || "",
              supplementationProgram: result.supplementation_program || "",
              supportingTherapies: result.supporting_therapies || "",
            }
          }
        }
      );
    } catch (err) {
      toast.error(`Błąd generowania AI: ${String(err)}`);
    } finally {
      setIsGeneratingRecommendation(false);
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
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
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
          channel: "email",
        },
      });

      if (error || data?.error) {
        toast.error(getFunctionInvokeErrorMessage(error) || data?.error || "Nie udało się wysłać odpowiedzi");
        return;
      }

      toast.success("Odpowiedź została wysłana");
      setNewQuestionReply("");
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
    } catch {
      toast.error("Nie udało się odnowić tokenu");
    } finally {
      setIsRegeneratingToken(null);
    }
  };

  const handleActivateProfile = async () => {
    if (!id || !activateProfileId || !activateReason || !activateProductId) {
      toast.error("Wybierz profil, powód i abonament");
      return;
    }
    setIsActivatingProfile(true);
    try {
      const { data, error } = await invokeAdminGrantAccess({
        patientId: id,
        personProfileId: activateProfileId,
        reason: activateReason,
        productId: activateProductId,
      });
      if (error) throw error;
      const profileName = personProfiles.find((p) => p.id === activateProfileId)?.name ?? null;
      toast.success(formatGrantAccessSuccessMessage(data?.grantedProfilesCount ?? 1, profileName));
      setIsActivateDialogOpen(false);
      setActivateProfileId("");
      setActivateReason("");
      setActivateProductId("");
      void queryClient.invalidateQueries({ queryKey: ["admin-patient-core", id] });
    } catch (error: unknown) {
      const message = await resolveGrantAccessErrorMessage(error);
      toast.error(message);
    } finally {
      setIsActivatingProfile(false);
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

  // When a specific person profile is selected, prefer its name in the header.
  // Fall back to account-level first_name + last_name only when no profile name is available.
  const selectedProfileName = normalizeDisplayName(selectedPersonProfile?.name);
  const fullName = selectedProfileName
    ? selectedProfileName
    : resolvePatientDisplayName(firstName, lastName, primaryPersonProfileName || null);

  // Initials: derive from the selected person profile's name (first letters of each word)
  const initials = (() => {
    if (selectedProfileName) {
      const parts = selectedProfileName.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    }
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return "?";
  })();

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
      <FileViewerModal
        open={fileViewerOpen}
        onOpenChange={setFileViewerOpen}
        fileUrl={fileViewerUrl}
        fileName={fileViewerName}
        isLoading={fileViewerLoading}
        onDownload={fileViewerDownloadFn}
      />
      {/* Dialog aktywacji profilu */}
      <Dialog open={isActivateDialogOpen} onOpenChange={(open) => {
        setIsActivateDialogOpen(open);
        if (!open) { setActivateReason(""); setActivateProductId(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aktywuj dostęp dla profilu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Profil</p>
              <p className="text-sm text-muted-foreground">
                {personProfiles.find((p) => p.id === activateProfileId)?.name || activateProfileId}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Powód nadania dostępu</p>
              <Select value={activateReason} onValueChange={setActivateReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz powód" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platnosc_gotowka">Płatność gotówką</SelectItem>
                  <SelectItem value="inny_przypadek">Inny przypadek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Abonament</p>
              <Select value={activateProductId} onValueChange={setActivateProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz abonament" />
                </SelectTrigger>
                <SelectContent>
                  {allPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.price} zł{pkg.billing === "monthly" ? "/mies." : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => void handleActivateProfile()}
                disabled={isActivatingProfile || !activateReason || !activateProductId}
              >
                {isActivatingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Aktywuję...</> : "Aktywuj dostęp"}
              </Button>
              <Button variant="outline" onClick={() => setIsActivateDialogOpen(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="rounded-xl bg-background p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}> 
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Klient: {fullName}</h1>
                <p className="text-sm text-muted-foreground">Widok wynikowy i komunikacja klienta</p>
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

          {/* AI Draft banner — shown when a draft recommendation exists for selected profile */}
          {filteredRecommendations.some((r) => r.is_draft) && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Szkic AI gotowy</strong> — AI przygotowało wstępny szkic zaleceń na podstawie wywiadu. Przejrzyj i wyślij do klienta.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  const draft = filteredRecommendations.find((r) => r.is_draft);
                  if (draft) navigate(`/admin/patient/${id}/recommendation/${draft.id}/edit`);
                }}
              >
                Przejrzyj szkic
              </Button>
            </div>
          )}

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

            <Button
              size="sm"
              onClick={() =>
                navigate(
                  `/admin/patient/${id}/recommendation/new${selectedProfileId ? `?profileId=${selectedProfileId}` : ""}`,
                )
              }
            >
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
                <CardTitle>Podsumowanie funkcjonowania Twojego organizmu</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRecommendation ? (
                  <div className="space-y-3">
                    <p className="font-semibold">{selectedRecommendation.title || "Zalecenie"}</p>
                    <div
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          selectedRecommendation.diagnosis_summary || "Brak podsumowania funkcjonowania organizmu dla tego zalecenia.",
                          { ALLOWED_TAGS: ["p","strong","em","u","s","span","h1","h2","h3","ul","ol","li","br"], ALLOWED_ATTR: ["style","class"] }
                        ),
                      }}
                    />
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
                <CardTitle>Wyniki badań laboratoryjne klienta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resultFiles.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resultFiles.map((file) => (
                      <div key={file.id} className="rounded-md border p-3 text-sm">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-muted-foreground text-xs">{format(new Date(file.created_at), "dd.MM.yyyy HH:mm", { locale: pl })} {file.file_size ? `• ${formatFileSize(file.file_size)}` : ""}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => void openFileWithSignedUrl("patient-result-files", file.file_path, file.file_name)}>
                            Otwórz
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void downloadFileWithSignedUrl("patient-result-files", file.file_path, file.file_name)}>
                            Pobierz
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
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
                            <Button size="sm" variant="outline" onClick={() => void openFileWithSignedUrl("patient-device-files", file.file_path, file.file_name)}>
                              Otwórz
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void downloadFileWithSignedUrl("patient-device-files", file.file_path, file.file_name)}>
                              Pobierz
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
                  <Textarea
                    value={deviceCardText}
                    onChange={(e) => setDeviceCardText(e.target.value)}
                    placeholder="Wklej tutaj dane z urządzenia (Quantec) lub wgraj plik — tekst pojawi się automatycznie..."
                    className="min-h-[130px]"
                  />
                  <input
                    ref={deviceFileInputRef}
                    data-testid="device-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
                <div className="space-y-4">
                  <h3 className="font-semibold">Dane do AI</h3>

                  {/* Input */}
                  <Textarea
                    value={aiData}
                    onChange={(e) => setAiData(e.target.value)}
                    placeholder="Wklej notatki z konsultacji lub nagraj głosowo..."
                    className="min-h-[150px]"
                  />

                  {/* Pomocnicze: nagranie + plik */}
                  <div className="flex flex-wrap items-center gap-2">
                    <VoiceRecorder
                      onTranscription={(text) =>
                        setAiData((prev) => prev ? `${prev}\n${text}` : text)
                      }
                    />
                    <input
                      ref={aiFileInputRef}
                      data-testid="ai-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setAiAttachment(file);
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => aiFileInputRef.current?.click()} className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      {aiAttachment ? aiAttachment.name : "Dodaj plik"}
                    </Button>
                    {aiAttachment && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        setAiAttachment(null);
                        if (aiFileInputRef.current) aiFileInputRef.current.value = "";
                      }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Akcje główne */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-border">
                    <Button
                      onClick={() => void handleGenerateFromAiData()}
                      disabled={isGeneratingRecommendation || !aiData.trim()}
                      className="w-full"
                    >
                      {isGeneratingRecommendation
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Generuję zalecenia z AI...</>
                        : <><Sparkles className="w-4 h-4 mr-2"/>Generuj zalecenia z AI</>
                      }
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleSaveAiEntry()} disabled={isSavingAiData || !aiData.trim()} className="w-full">
                      {isSavingAiData ? "Zapisywanie..." : "Zapisz notatki bez generowania"}
                    </Button>
                  </div>

                  {/* Historia — zwijana */}
                  {aiEntries.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 list-none select-none">
                        <span>Historia danych AI ({aiEntries.length})</span>
                        <span className="ml-auto text-xs group-open:hidden">▼</span>
                        <span className="ml-auto text-xs hidden group-open:inline">▲</span>
                      </summary>
                      <div className="mt-2 space-y-2">
                        {aiEntries.map((entry) => (
                          <div key={entry.id} className="rounded-md border p-3 text-sm space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                            </p>
                            <p className="whitespace-pre-wrap">{entry.content}</p>
                            {entry.attachment_file_path && (
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => void openFileWithSignedUrl("patient-ai-files", entry.attachment_file_path!, entry.attachment_file_name ?? undefined)}>
                                  Otwórz załącznik
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => void downloadFileWithSignedUrl("patient-ai-files", entry.attachment_file_path!, entry.attachment_file_name ?? undefined)}>
                                  Pobierz
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
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
                  <span className="font-semibold">Status analizy organizmu</span>
                  <Badge variant="secondary">{patient?.diagnosis_status || "Brak"}</Badge>
                </div>
                <Button variant="outline" className="w-full justify-start" onClick={setInterviewTab} disabled={!canOpenInterview}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Zobacz wyniki ankiety (wywiad dietetyczny)
                </Button>
                {!canOpenInterview && (
                  <p className="text-xs text-muted-foreground">Brak wysłanego wywiadu dla tego profilu.</p>
                )}
                {selectedProfileId && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate(`/admin/patient/${id}/interview/${selectedProfileId}`)}
                  >
                    <PenLine className="h-4 w-4 mr-2" />
                    Wypełnij wywiad za pacjenta
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Historia płatności */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  Historia płatności
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak historii płatności dla tego klienta.</p>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((record) => {
                      const isActive = record.status === "active";
                      const safeFormat = (dateStr: string | null): string => {
                        if (!dateStr) return "Brak daty";
                        try {
                          const d = new Date(dateStr);
                          if (isNaN(d.getTime())) return "Brak daty";
                          return format(d, "dd.MM.yyyy HH:mm", { locale: pl });
                        } catch {
                          return "Brak daty";
                        }
                      };
                      const dateDisplay = record.activated_at
                        ? safeFormat(record.activated_at)
                        : safeFormat(record.created_at);

                      return (
                        <div key={record.id} className="rounded-lg border p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isActive ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="text-sm font-semibold">{dateDisplay}</span>
                                {record.profile_name && personProfiles.length > 1 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    profil: {record.profile_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              className={isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
                            >
                              {isActive ? "Aktywna" : record.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm pl-6">
                            <span className="text-muted-foreground whitespace-nowrap">Źródło płatności:</span>
                            <span className="font-medium">{record.source_label}</span>

                            <span className="text-muted-foreground whitespace-nowrap">Usługa / pakiet:</span>
                            <span className={record.product_name ? "font-medium" : "text-muted-foreground italic"}>
                              {record.product_name ?? "brak szczegółów"}
                            </span>

                            {record.reason_label && (
                              <>
                                <span className="text-muted-foreground whitespace-nowrap">Powód nadania:</span>
                                <span className="font-medium">{record.reason_label}</span>
                              </>
                            )}

                            {record.stripe_session_id && (
                              <>
                                <span className="text-muted-foreground whitespace-nowrap">Sesja Stripe:</span>
                                <span className="font-mono text-xs text-muted-foreground truncate" title={record.stripe_session_id}>
                                  {record.stripe_session_id.slice(0, 28)}…
                                </span>
                              </>
                            )}

                            {record.stripe_subscription_id && (
                              <>
                                <span className="text-muted-foreground whitespace-nowrap">Subskrypcja Stripe:</span>
                                <span className="font-mono text-xs text-muted-foreground truncate" title={record.stripe_subscription_id}>
                                  {record.stripe_subscription_id.slice(0, 28)}…
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {activeTab === "interview" && (
              <Card>
                <CardHeader>
                  <CardTitle>Wywiad dietetyczny</CardTitle>
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
                  <div className="space-y-2">
                    {personProfiles.map((pp) => {
                      const hasActivePayment = paymentHistory.some(
                        (ph) => ph.person_profile_id === pp.id && ph.status === "active",
                      );
                      return (
                        <div key={pp.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                          <Badge
                            variant={pp.id === selectedProfileId ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => setSelectedProfileId(pp.id)}
                          >
                            {(normalizeDisplayName(pp.name) || "—")}{pp.is_primary ? " ★" : ""}
                          </Badge>
                          {!hasActivePayment && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActivateProfileId(pp.id);
                                setActivateReason("");
                                setActivateProductId("");
                                setIsActivateDialogOpen(true);
                              }}
                            >
                              Aktywuj dostęp
                            </Button>
                          )}
                          {hasActivePayment && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Aktywny
                            </span>
                          )}
                        </div>
                      );
                    })}
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
                      {isDeleting ? "Usuwanie..." : isDeletingSelf ? "Nie można usunąć" : "Usuń klienta"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno chcesz usunąć tego klienta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja jest nieodwracalna. Zostaną usunięte profile, zalecenia, wyniki badań, notatki i wiadomości.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Usuń klienta
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
