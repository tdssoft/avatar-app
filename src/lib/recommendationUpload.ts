export const MAX_RECOMMENDATION_FILE_SIZE = 20 * 1024 * 1024;
export const ALLOWED_RECOMMENDATION_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const getRecommendationUploadValidationError = (file: File) => {
  const fileName = file.name.toLowerCase();
  const isAllowedMimeType = ALLOWED_RECOMMENDATION_FILE_TYPES.includes(file.type);
  const hasAllowedExtension =
    fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx");

  if (!isAllowedMimeType && !hasAllowedExtension) {
    return "Dozwolone formaty plików: PDF, DOC, DOCX";
  }

  if (file.size > MAX_RECOMMENDATION_FILE_SIZE) {
    return "Maksymalny rozmiar pliku to 20MB";
  }

  return null;
};
