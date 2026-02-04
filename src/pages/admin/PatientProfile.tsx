import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Upload, Send, MessageSquare, FileText, User, Phone, Mail, ClipboardList, Mic, RefreshCw, Tag, X, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import AdminInterviewView from "@/components/admin/AdminInterviewView";
import AudioRecorder from "@/components/audio/AudioRecorder";
import AudioRecordingsList from "@/components/audio/AudioRecordingsList";
import { useAuth } from "@/contexts/AuthContext";

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
  avatar_url: string | null;
}

interface PersonProfile {
  id: string;
  name: string;
  is_primary: boolean;
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
}

interface Message {
  id: string;
  message_type: string;
  message_text: string;
  sent_at: string;
  person_profile_id: string | null;
}

const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newReply, setNewReply] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [audioRefreshTrigger, setAudioRefreshTrigger] = useState(0);
  const [newTag, setNewTag] = useState("");
  const [isRegeneratingToken, setIsRegeneratingToken] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    try {
      // Fetch patient
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, avatar_url")
        .eq("user_id", patientData.user_id)
        .single();

      if (!profileError) {
        setProfile(profileData);
      }

      // Fetch person profiles
      const { data: personProfilesData } = await supabase
        .from("person_profiles")
        .select("id, name, is_primary")
        .eq("account_user_id", patientData.user_id)
        .order("is_primary", { ascending: false });

      if (personProfilesData) {
        setPersonProfiles(personProfilesData);
        // Auto-select primary profile
        const primaryProfile = personProfilesData.find((p) => p.is_primary);
        if (primaryProfile) {
          setSelectedProfileId(primaryProfile.id);
        } else if (personProfilesData.length > 0) {
          setSelectedProfileId(personProfilesData[0].id);
        }
      }

      // Fetch recommendations
      const { data: recsData } = await supabase
        .from("recommendations")
        .select("id, recommendation_date, body_systems, diagnosis_summary, pdf_url, created_at, title, person_profile_id, download_token, token_expires_at")
        .eq("patient_id", id)
        .order("recommendation_date", { ascending: false });

      setRecommendations(recsData || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from("patient_notes")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      setNotes(notesData || []);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("patient_messages")
        .select("*")
        .eq("patient_id", id)
        .order("sent_at", { ascending: false });

      setMessages(messagesData || []);

    } catch (error) {
      console.error("[PatientProfile] Error:", error);
      toast.error("Nie udało się załadować danych pacjenta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!id) return;

    // Extra guard (backend also blocks this)
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
        console.error("[PatientProfile] Delete error:", error);
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
      console.error("[PatientProfile] Delete error:", error);
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
      fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Error adding note:", error);
      toast.error("Nie udało się dodać notatki");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !id) return;

    setIsSendingReply(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("patient_messages")
        .insert({
          patient_id: id,
          admin_id: userData.user?.id,
          message_type: "answer",
          message_text: newReply.trim(),
          person_profile_id: selectedProfileId || null,
        });

      if (error) throw error;

      toast.success("Odpowiedź została wysłana");
      setNewReply("");
      fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Error sending reply:", error);
      toast.error("Nie udało się wysłać odpowiedzi");
    } finally {
      setIsSendingReply(false);
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
    } catch (error) {
      console.error("[PatientProfile] Error adding tag:", error);
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
    } catch (error) {
      console.error("[PatientProfile] Error removing tag:", error);
      toast.error("Nie udało się usunąć tagu");
    }
  };

  const handleRegenerateToken = async (recommendationId: string) => {
    setIsRegeneratingToken(recommendationId);
    try {
      // Generate new token and expiry (7 days from now)
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
      fetchPatientData();
    } catch (error) {
      console.error("[PatientProfile] Error regenerating token:", error);
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
    const profile = personProfiles.find((p) => p.id === profileId);
    return profile?.name || "";
  };

  const fullName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : "Nieznany pacjent";

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : "?";

  // Filter recommendations by selected profile
  const filteredRecommendations = selectedProfileId
    ? recommendations.filter((r) => r.person_profile_id === selectedProfileId || !r.person_profile_id)
    : recommendations;

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-white">Pacjent: {fullName}</h1>
              <p className="text-white/80">Zarządzaj danymi pacjenta i zaleceniami</p>
            </div>
          </div>

          {/* Profile selector */}
          {personProfiles.length > 1 && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Wybierz profil" />
                </SelectTrigger>
                <SelectContent>
                  {personProfiles.map((pp) => (
                    <SelectItem key={pp.id} value={pp.id}>
                      {pp.name}
                      {pp.is_primary && " (główny)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="recommendations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="recommendations" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Zalecenia
                </TabsTrigger>
                <TabsTrigger value="interview" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Wywiad
                </TabsTrigger>
                <TabsTrigger value="audio" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Nagrania
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notatki
                </TabsTrigger>
              </TabsList>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Zalecenia zdrowotne</CardTitle>
                    <Button 
                      size="sm" 
                      className="gap-2"
                      onClick={() => navigate(`/admin/patient/${id}/recommendation/new`)}
                    >
                      <Plus className="h-4 w-4" />
                      Dodaj zalecenia
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {filteredRecommendations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Brak zaleceń</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredRecommendations.map((rec) => {
                          const tokenExpired = isTokenExpired(rec.token_expires_at);
                          
                          return (
                            <div key={rec.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {rec.title || `Zalecenia z dnia ${format(new Date(rec.recommendation_date), "dd.MM.yyyy", { locale: pl })}`}
                                    </p>
                                    {tokenExpired && (
                                      <Badge variant="destructive" className="text-xs">
                                        Token wygasł
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {rec.body_systems?.length || 0} układów ciała
                                    {rec.person_profile_id && ` • ${getProfileName(rec.person_profile_id)}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {tokenExpired && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRegenerateToken(rec.id)}
                                    disabled={isRegeneratingToken === rec.id}
                                    className="gap-1"
                                  >
                                    <RefreshCw className={`h-4 w-4 ${isRegeneratingToken === rec.id ? "animate-spin" : ""}`} />
                                    Odnów token
                                  </Button>
                                )}
                                {rec.pdf_url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={rec.pdf_url} target="_blank" rel="noopener noreferrer">
                                      Pobierz PDF
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Interview Tab */}
              <TabsContent value="interview">
                {selectedProfileId ? (
                  <AdminInterviewView
                    personProfileId={selectedProfileId}
                    patientId={id || ""}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Wybierz profil, aby zobaczyć wywiad żywieniowy
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Audio Tab */}
              <TabsContent value="audio" className="space-y-4">
                {selectedProfileId ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Nagraj nowe audio</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AudioRecorder
                          personProfileId={selectedProfileId}
                          onSaved={() => setAudioRefreshTrigger((prev) => prev + 1)}
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Wszystkie nagrania</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AudioRecordingsList
                          personProfileId={selectedProfileId}
                          refreshTrigger={audioRefreshTrigger}
                        />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Wybierz profil, aby zarządzać nagraniami audio
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notatki</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Dodaj notatkę..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    <Button onClick={handleAddNote} disabled={!newNote.trim() || isAddingNote}>
                      {isAddingNote ? "Dodawanie..." : "Dodaj notatkę"}
                    </Button>

                    {notes.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          {notes.map((note) => (
                            <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm">{note.note_text}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(note.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Messages Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Komunikacja</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Reply form */}
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Napisz odpowiedź do pacjenta..."
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        className="min-h-[80px]"
                        disabled={isSendingReply}
                      />
                      <Button 
                        onClick={handleSendReply} 
                        disabled={!newReply.trim() || isSendingReply}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSendingReply ? "Wysyłanie..." : "Wyślij odpowiedź"}
                      </Button>
                    </div>

                    {messages.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div 
                              key={msg.id} 
                              className={`p-3 rounded-lg ${
                                msg.message_type === 'question' 
                                  ? 'bg-muted/50' 
                                  : 'bg-primary/5 border border-primary/20'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {msg.message_type === 'sms' ? 'SMS' : msg.message_type === 'question' ? 'Pytanie' : 'Odpowiedź'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.sent_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                                </span>
                              </div>
                              <p className="text-sm">{msg.message_text}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {messages.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Brak wiadomości od pacjenta</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Patient Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={fullName} />
                    ) : null}
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{fullName}</h3>
                  
                  <div className="w-full mt-4 space-y-3 text-left">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{email || "Brak email"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{profile?.phone || "Brak telefonu"}</span>
                    </div>
                  </div>

                  {/* Person profiles */}
                  {personProfiles.length > 0 && (
                    <div className="w-full mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-2">Profile osób:</p>
                      <div className="flex flex-wrap gap-2">
                        {personProfiles.map((pp) => (
                          <Badge
                            key={pp.id}
                            variant={pp.id === selectedProfileId ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => setSelectedProfileId(pp.id)}
                          >
                            {pp.name}
                            {pp.is_primary && " ★"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tagi pacjenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(patient?.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {(!patient?.tags || patient.tags.length === 0) && (
                    <p className="text-sm text-muted-foreground">Brak tagów</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nowy tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pakiet pacjenta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={patient?.subscription_status === "Aktywna" ? "default" : "secondary"}>
                      {patient?.subscription_status || "Brak"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diagnoza:</span>
                    <Badge variant="secondary">
                      {patient?.diagnosis_status || "Brak"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Szybkie akcje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Upload className="h-4 w-4" />
                  Przeglądaj ankietę
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Poprzednie wyniki
                </Button>
                
                <Separator className="my-3" />
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start gap-2"
                      disabled={isDeleting || isDeletingSelf}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "Usuwanie..." : isDeletingSelf ? "Nie można usunąć" : "Usuń pacjenta"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno chcesz usunąć tego pacjenta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja jest nieodwracalna. Zostaną usunięte wszystkie dane pacjenta, 
                        w tym profile, zalecenia, wyniki badań, notatki i wiadomości. 
                        Konto użytkownika zostanie trwale usunięte z systemu.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeletePatient}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Usuń pacjenta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {isDeletingSelf && (
                  <p className="text-xs text-muted-foreground">
                    To jest Twoje konto administratora — backend blokuje jego usunięcie.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PatientProfile;