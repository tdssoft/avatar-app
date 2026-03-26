import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FileViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Signed URL for the file (already resolved) */
  fileUrl: string | null;
  /** Display name of the file */
  fileName: string;
  /** Whether the signed URL is still being fetched */
  isLoading?: boolean;
  /** Called when the user clicks the download button */
  onDownload?: () => void;
}

const isWordFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.endsWith(".doc") || lower.endsWith(".docx");
};

const isPdfFile = (name: string): boolean => name.toLowerCase().endsWith(".pdf");

const isImageFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
};

const FileViewerModal = ({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  isLoading = false,
  onDownload,
}: FileViewerModalProps) => {
  const word = isWordFile(fileName);
  const pdf = isPdfFile(fileName);
  const image = isImageFile(fileName);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="h-full min-h-[300px] grid place-items-center text-muted-foreground">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Ładowanie podglądu pliku...</span>
          </div>
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="h-full min-h-[300px] grid place-items-center text-muted-foreground">
          Nie udało się załadować podglądu pliku.
        </div>
      );
    }

    if (word) {
      // Browsers cannot render .doc/.docx natively — use Google Docs Viewer
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <iframe
          src={googleViewerUrl}
          title={fileName}
          className="w-full h-full min-h-[420px] rounded-md border bg-background"
        />
      );
    }

    if (pdf) {
      return (
        <iframe
          src={fileUrl}
          title={fileName}
          className="w-full h-full min-h-[420px] rounded-md border bg-background"
        />
      );
    }

    if (image) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-[75vh] max-w-full object-contain rounded-md"
          />
        </div>
      );
    }

    // Unknown format — show download prompt
    return (
      <div className="h-full min-h-[300px] grid place-items-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">
            Podgląd niedostępny dla tego formatu pliku.
          </p>
          {onDownload && (
            <Button onClick={onDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Pobierz plik
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="px-6 pt-4 pb-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate pr-4">{fileName || "Podgląd pliku"}</DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <Button size="sm" variant="outline" onClick={onDownload} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Pobierz
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6 pt-3 overflow-hidden">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileViewerModal;
