import { describe, expect, it, vi } from "vitest";

import { triggerDownload } from "./download";

describe("triggerDownload", () => {
  it("does not throw when the link is already removed before cleanup runs", async () => {
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const revokeMock = vi.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeMock,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function removeSelfOnClick(this: HTMLAnchorElement) {
        if (this.parentNode === document.body) {
          document.body.removeChild(this);
        }
      });

    expect(() =>
      triggerDownload({
        href: "blob:test-url",
        fileName: "export.csv",
        revokeObjectUrl: true,
      }),
    ).not.toThrow();

    await Promise.resolve();

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeMock).toHaveBeenCalledWith("blob:test-url");

    clickSpy.mockRestore();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  });
});
