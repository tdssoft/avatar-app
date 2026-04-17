import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from "sonner";

// Safety net: avoid blank screen on unhandled async errors.
window.addEventListener("unhandledrejection", (event) => {
  console.error("[global] Unhandled promise rejection:", event.reason);
  toast.error("Wystąpił błąd. Spróbuj ponownie.");
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("[global] Unhandled error:", event.error || event.message);
});

createRoot(document.getElementById("root")!).render(<App />);
