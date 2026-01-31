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

      {/* Responsive grid of image tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-w-3xl">
        {bodySystemsOptions.map((system) => {
          const isSelected = selectedSystems.includes(system.id);
          const image = systemImages[system.id];

          return (
            <button
              key={system.id}
              onClick={() => onToggle(system.id)}
              className={cn(
                "group relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
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
                  className="absolute inset-0 w-full h-full object-contain p-1 bg-background transition-transform duration-300 group-hover:scale-105"
                />
              )}

              {/* Dark gradient overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-all duration-200",
                "group-hover:from-black/90 group-hover:via-black/40"
              )} />

              {/* Name - always visible */}
              <div className="absolute inset-x-0 bottom-0 p-2">
                <span className="text-white font-semibold text-xs text-center block drop-shadow-lg">
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
