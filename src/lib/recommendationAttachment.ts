export const resolveRecommendationAttachmentPath = ({
  existingFilePath,
  removeExistingFile,
  uploadedFilePath,
}: {
  existingFilePath: string | null;
  removeExistingFile: boolean;
  uploadedFilePath?: string | null;
}) => {
  if (uploadedFilePath) {
    return uploadedFilePath;
  }

  if (removeExistingFile) {
    return null;
  }

  return existingFilePath;
};
