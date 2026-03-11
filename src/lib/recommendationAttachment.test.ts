import { describe, expect, it } from "vitest";

import { resolveRecommendationAttachmentPath } from "./recommendationAttachment";

describe("resolveRecommendationAttachmentPath", () => {
  it("keeps the existing file when nothing changes", () => {
    expect(
      resolveRecommendationAttachmentPath({
        existingFilePath: "patient/profile/file.docx",
        removeExistingFile: false,
      }),
    ).toBe("patient/profile/file.docx");
  });

  it("drops the existing file when user explicitly removes it", () => {
    expect(
      resolveRecommendationAttachmentPath({
        existingFilePath: "patient/profile/file.docx",
        removeExistingFile: true,
      }),
    ).toBeNull();
  });

  it("prefers a newly uploaded file over the existing one", () => {
    expect(
      resolveRecommendationAttachmentPath({
        existingFilePath: "patient/profile/file.docx",
        removeExistingFile: true,
        uploadedFilePath: "patient/profile/new-file.pdf",
      }),
    ).toBe("patient/profile/new-file.pdf");
  });
});
