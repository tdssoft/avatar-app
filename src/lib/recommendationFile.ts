import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "recommendation-files";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderEmbeddedPdfPreview = (targetWindow: Window, fileUrl: string, fileName: string) => {
  const safeTitle = escapeHtml(fileName || "Podgląd pliku");
  const safeUrl = escapeHtml(fileUrl);

  targetWindow.document.open();
  targetWindow.document.write(`<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #0f172a; }
      .header {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        background: #111827;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }
      .download-link {
        color: #67e8f9;
        text-decoration: none;
        font-weight: 600;
      }
      iframe {
        width: 100%;
        height: calc(100% - 49px);
        border: 0;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <span>${safeTitle}</span>
      <a class="download-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer" download>Pobierz plik</a>
    </div>
    <iframe src="${safeUrl}" title="Podgląd pliku PDF"></iframe>
  </body>
</html>`);
  targetWindow.document.close();
};


const renderLoadingPreview = (targetWindow: Window) => {
  targetWindow.document.open();
  targetWindow.document.write(`<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ładowanie pliku…</title>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        background: #0f172a;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, sans-serif;
      }
    </style>
  </head>
  <body>
    <p>Ładowanie pliku…</p>
  </body>
</html>`);
  targetWindow.document.close();
};
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

export const openRecommendationFileInNewTab = async (fileRef: string): Promise<void> => {
  const pendingTab = window.open("about:blank", "_blank");

  if (pendingTab) {
    pendingTab.opener = null;
    renderLoadingPreview(pendingTab);
  }

  try {
    const fileUrl = await resolveRecommendationFileUrl(fileRef);
    const fileExtension = getRecommendationFileExtension(fileRef);
    const fileName = getRecommendationFileName(fileRef);

    if (pendingTab) {
      if (fileExtension === "pdf") {
        renderEmbeddedPdfPreview(pendingTab, fileUrl, fileName);
        return;
      }

      pendingTab.location.replace(fileUrl);
      return;
    }

    window.location.assign(fileUrl);
  } catch (error) {
    pendingTab?.close();
    throw error;
  }
};

export const downloadRecommendationFile = async (fileRef: string): Promise<void> => {
  const fileUrl = await resolveRecommendationFileUrl(fileRef);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = getRecommendationFileName(fileRef) || "zalecenie";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
