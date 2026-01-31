import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Import body system images
import limfatycznyImg from "@/assets/body-systems/limfatyczny.png";
import nerwowyImg from "@/assets/body-systems/nerwowy.png";
import miesniowyImg from "@/assets/body-systems/miesniowy.png";
import oddechowyImg from "@/assets/body-systems/oddechowy.png";
import krazeniowyImg from "@/assets/body-systems/krazeniowy.png";
import moczowyImg from "@/assets/body-systems/moczowy.png";
import hormonalnyImg from "@/assets/body-systems/hormonalny.png";
import odpornosciowyImg from "@/assets/body-systems/odpornosciowy.png";

const bodySystemsOptions = [
  { id: "limfatyczny", label: "Limfatyczny" },
  { id: "nerwowy", label: "Nerwowy" },
  { id: "miesniowy", label: "Mięśniowy" },
  { id: "oddechowy", label: "Oddechowy" },
  { id: "krazeniowy", label: "Krążeniowy" },
  { id: "moczowy", label: "Moczowy" },
  { id: "hormonalny", label: "Hormonalny" },
  { id: "odpornosciowy", label: "Odpornościowy" },
  // Systems without images - hidden for now
  // { id: "szkieletowy", label: "Szkieletowy" },
  // { id: "pokarmowy", label: "Pokarmowy" },
  // { id: "rozrodczy", label: "Rozrodczy" },
  // { id: "powlokowy", label: "Powłokowy" },
];

// Map system IDs to their images
const systemImages: Record<string, string> = {
  limfatyczny: limfatycznyImg,
  nerwowy: nerwowyImg,
  miesniowy: miesniowyImg,
  oddechowy: oddechowyImg,
  krazeniowy: krazeniowyImg,
  moczowy: moczowyImg,
  hormonalny: hormonalnyImg,
  odpornosciowy: odpornosciowyImg,
};

interface BodySystemsOverlayProps {
  selectedSystems: string[];
  onToggle: (systemId: string) => void;
}

const BodySystemsOverlay = ({ selectedSystems, onToggle }: BodySystemsOverlayProps) => {
  return (
    <div className="space-y-3">
      {/* Selected count */}
      {selectedSystems.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Wybrano: <span className="font-medium text-foreground">{selectedSystems.length}</span> układów
        </p>
      )}

      {/* Responsive grid of image tiles (fits the available panel width) */}
      <div className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        {bodySystemsOptions.map((system) => {
          const isSelected = selectedSystems.includes(system.id);
          const image = systemImages[system.id];

          return (
            <button
              key={system.id}
              onClick={() => onToggle(system.id)}
              className={cn(
                "group relative w-full min-w-0 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-colors duration-200",
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Image */}
              {image && (
                <img
                  src={image}
                  alt={system.label}
                  className="absolute inset-0 w-full h-full object-contain p-1 bg-background"
                />
              )}

              {/* Dark gradient overlay */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent transition-all duration-200",
                  "group-hover:from-foreground/90 group-hover:via-foreground/40"
                )}
              />

              {/* Hover overlay - centered label */}
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors duration-200 group-hover:bg-foreground/35">
                <span className="text-background font-semibold text-sm text-center px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {system.label}
                </span>
              </div>

              {/* Name - always visible */}
              <div className="absolute inset-x-0 bottom-0 p-2">
                <span className="text-background font-semibold text-[11px] sm:text-xs text-center block drop-shadow-lg truncate">
                  {system.label}
                </span>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BodySystemsOverlay;
