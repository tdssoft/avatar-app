export const triggerDownload = ({
  href,
  fileName,
  revokeObjectUrl = false,
}: {
  href: string;
  fileName: string;
  revokeObjectUrl?: boolean;
}) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    queueMicrotask(() => {
      if (link.parentNode === document.body) {
        document.body.removeChild(link);
      }
      if (revokeObjectUrl) {
        URL.revokeObjectURL(href);
      }
    });
  }
};
