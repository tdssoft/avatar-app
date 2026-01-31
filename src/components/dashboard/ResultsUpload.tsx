import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileCheck, X, Loader2, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface ResultsUploadProps {
  className?: string;
}

const ResultsUpload = ({ className }: ResultsUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndFiles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch existing files
        const { data, error } = await supabase
          .from("user_results")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (!error && data) {
          setUploadedFiles(data);
        }
      }
    };
    fetchUserAndFiles();
  }, []);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Nieprawidłowy typ pliku",
        description: "Dozwolone formaty: PDF, JPG, PNG",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Plik zbyt duży",
        description: "Maksymalny rozmiar pliku to 10MB",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const uploadFiles = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = validFiles.length;
    let uploadedCount = 0;
    const newFiles: UploadedFile[] = [];

    for (const file of validFiles) {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("results")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { data, error: dbError } = await supabase
          .from("user_results")
          .insert({
            user_id: userId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        if (data) {
          newFiles.push(data);
        }

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Błąd",
          description: `Nie udało się wgrać pliku: ${file.name}`,
          variant: "destructive",
        });
      }
    }

    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...newFiles, ...prev]);
      toast({
        title: "Sukces",
        description: `Wgrano ${newFiles.length} ${newFiles.length === 1 ? "plik" : "pliki/plików"}`,
      });
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      uploadFiles(Array.from(files));
    }
    // Reset input
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
      uploadFiles(Array.from(files));
    }
  }, [userId]);

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from("results").remove([filePath]);

      // Delete from database
      await supabase.from("user_results").delete().eq("id", fileId);

      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: "Sukces",
        description: "Plik został usunięty",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć pliku",
        variant: "destructive",
      });
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handlePreview = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("results")
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się otworzyć podglądu pliku",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("results")
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Download error:", error);
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
        <CardTitle className="text-2xl font-bold">
          Jeśli posiadasz wyniki poprzednich badań, wgraj je tutaj:
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
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
              <p className="text-muted-foreground mb-4">
                Przeciągnij pliki tutaj lub kliknij, aby wybrać
              </p>
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                Wybierz pliki
              </Button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-foreground mb-3">Przesłane pliki:</h3>
            <ul className="space-y-2">
              {uploadedFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">{file.file_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreview(file.file_path)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Podgląd"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file.file_path, file.file_name)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Pobierz"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.file_path)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Usuń plik"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsUpload;
