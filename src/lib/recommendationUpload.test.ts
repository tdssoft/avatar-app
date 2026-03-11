import { describe, expect, it } from "vitest";

import {
  MAX_RECOMMENDATION_FILE_SIZE,
  getRecommendationUploadValidationError,
} from "./recommendationUpload";

describe("getRecommendationUploadValidationError", () => {
  it("accepts docx files", () => {
    const file = new File(["docx"], "zalecenie.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(getRecommendationUploadValidationError(file)).toBeNull();
  });

  it("accepts doc files by extension even if the browser omits mime type", () => {
    const file = new File(["doc"], "zalecenie.doc", { type: "" });

    expect(getRecommendationUploadValidationError(file)).toBeNull();
  });

  it("rejects unsupported file types", () => {
    const file = new File(["zip"], "zalecenie.zip", { type: "application/zip" });

    expect(getRecommendationUploadValidationError(file)).toBe("Dozwolone formaty plików: PDF, DOC, DOCX");
  });

  it("rejects files above the size limit", () => {
    const file = new File([new Uint8Array(MAX_RECOMMENDATION_FILE_SIZE + 1)], "zalecenie.pdf", {
      type: "application/pdf",
    });

    expect(getRecommendationUploadValidationError(file)).toBe("Maksymalny rozmiar pliku to 20MB");
  });
});
