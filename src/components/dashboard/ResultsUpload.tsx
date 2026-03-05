import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileCheck, Loader2, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ACTIVE_PROFILE_CHANGED_EVENT } from "@/hooks/usePersonProfiles";
import {
  createPatientResultFileSignedUrl,
  fetchPatientResultFilesForActiveProfile,
  uploadPatientResultFileForActiveProfile,
  validatePatientResultFile,
  type PatientResultFileRecord,
} from "@/lib/patientResultFiles";

interface ResultsUploadProps {
  className?: string;
}

const ResultsUpload = ({ className }: ResultsUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<PatientResultFileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    if (!userId) return;

    try {
      const files = await fetchPatientResultFilesForActiveProfile(userId);
      setUploadedFiles(files);
    } catch (error) {
      console.error("[ResultsUpload] fetch files error:", error);
      setUploadedFiles([]);
    }
  }, [userId]);

  useEffect(() => {
    const fetchUserAndFiles = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;
      setUserId(user.id);
    };
    void fetchUserAndFiles();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void fetchFiles();
  }, [fetchFiles, userId]);

  useEffect(() => {
    const onProfileChanged = () => {
      void fetchFiles();
    };
    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);
    return () => window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, onProfileChanged);
  }, [fetchFiles]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`results-upload-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_result_files" }, () => {
        void fetchFiles();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchFiles, userId]);

  const uploadFiles = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    const validFiles = files.filter((file) => {
      const validationError = validatePatientResultFile(file);
      if (!validationError) return true;
      toast({
        title: "Nieprawidłowy plik",
        description: validationError,
        variant: "destructive",
      });
      return false;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = validFiles.length;
    let uploadedCount = 0;
    const newFiles: PatientResultFileRecord[] = [];

    for (const file of validFiles) {
      try {
        const insertedFile = await uploadPatientResultFileForActiveProfile(userId, file);
        newFiles.push(insertedFile);
        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      } catch (error) {
        console.error("[ResultsUpload] upload error:", error);
        toast({
          title: "Błąd",
          description: `Nie udało się wgrać pliku: ${file.name}`,
          variant: "destructive",
        });
      }
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...newFiles, ...prev]);
      toast({
        title: "Sukces",
        description: `Wgrano ${newFiles.length} ${newFiles.length === 1 ? "plik" : "pliki"}`,
      });
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      void uploadFiles(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      void uploadFiles(Array.from(files));
    }
  }, [userId]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handlePreview = async (filePath: string) => {
    try {
      const signedUrl = await createPatientResultFileSignedUrl(filePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[ResultsUpload] preview error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się otworzyć podglądu pliku",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const signedUrl = await createPatientResultFileSignedUrl(filePath);
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("[ResultsUpload] download error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać pliku",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-4xl font-bold leading-tight">Pliki wynikowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadedFiles.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uploadedFiles.map((file) => (
              <li key={file.id} className="rounded-md border border-border bg-muted/30 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground break-all leading-5">{file.file_name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => void handlePreview(file.file_path)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Podgląd"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDownload(file.file_path, file.file_name)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Pobierz"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto mb-4" />
              <p className="text-muted-foreground">Wgrywanie plików...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Przeciągnij pliki tutaj lub kliknij, aby wybrać</p>
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                Wybierz pliki
              </Button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardContent>
    </Card>
  );
};

export default ResultsUpload;
