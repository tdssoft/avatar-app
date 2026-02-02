import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Upload, Send, MessageSquare, FileText, User, Phone, Mail, ClipboardList, Mic } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import AdminInterviewView from "@/components/admin/AdminInterviewView";
import AudioRecorder from "@/components/audio/AudioRecorder";
import AudioRecordingsList from "@/components/audio/AudioRecordingsList";

interface PatientData {
  id: string;
  user_id: string;
  subscription_status: string;
  diagnosis_status: string;
  last_communication_at: string | null;
  admin_notes: string | null;
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
}

const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [audioRefreshTrigger, setAudioRefreshTrigger] = useState(0);

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
        .select("id, recommendation_date, body_systems, diagnosis_summary, pdf_url, created_at, title, person_profile_id")
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pacjent: {fullName}</h1>
              <p className="text-muted-foreground">Zarządzaj danymi pacjenta i zaleceniami</p>
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
                        {filteredRecommendations.map((rec) => (
                          <div key={rec.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {rec.title || `Zalecenia z dnia ${format(new Date(rec.recommendation_date), "dd.MM.yyyy", { locale: pl })}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {rec.body_systems?.length || 0} układów ciała
                                  {rec.person_profile_id && ` • ${getProfileName(rec.person_profile_id)}`}
                                </p>
                              </div>
                            </div>
                            {rec.pdf_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={rec.pdf_url} target="_blank" rel="noopener noreferrer">
                                  Pobierz PDF
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
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
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Komunikacja</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Send className="h-4 w-4" />
                        Wyślij SMS
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Odpowiedz
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {messages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Brak wiadomości</p>
                    ) : (
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PatientProfile;
