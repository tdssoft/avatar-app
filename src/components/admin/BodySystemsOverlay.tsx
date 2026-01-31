import { cn } from "@/lib/utils";
import { useState } from "react";
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
  { id: "szkieletowy", label: "Szkieletowy" },
  { id: "nerwowy", label: "Nerwowy" },
  { id: "miesniowy", label: "Mięśniowy" },
  { id: "oddechowy", label: "Oddechowy" },
  { id: "pokarmowy", label: "Pokarmowy" },
  { id: "krazeniowy", label: "Krążeniowy" },
  { id: "moczowy", label: "Moczowy" },
  { id: "hormonalny", label: "Hormonalny" },
  { id: "odpornosciowy", label: "Odpornościowy" },
  { id: "rozrodczy", label: "Rozrodczy" },
  { id: "powlokowy", label: "Powłokowy" },
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
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);

  // Show hovered system image, or first selected, or null
  const previewSystem = hoveredSystem || (selectedSystems.length > 0 ? selectedSystems[0] : null);
  const previewImage = previewSystem ? systemImages[previewSystem] : null;

  return (
    <div className="flex gap-4">
      {/* Preview Area */}
      <div className="flex-shrink-0 w-40">
        <div className="aspect-[3/4] bg-muted/30 rounded-lg overflow-hidden border border-border flex items-center justify-center">
          {previewImage ? (
            <img
              src={previewImage}
              alt={`Układ ${previewSystem}`}
              className="w-full h-full object-contain p-2 animate-in fade-in duration-200"
            />
          ) : (
            <span className="text-muted-foreground text-xs text-center px-2">
              Najedź na układ lub wybierz
            </span>
          )}
        </div>
        {selectedSystems.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Wybrano: {selectedSystems.length}
          </p>
        )}
      </div>

      {/* Grid of system tiles */}
      <div className="flex-1 grid grid-cols-3 gap-2">
        {bodySystemsOptions.map((system) => {
          const isSelected = selectedSystems.includes(system.id);
          const hasImage = !!systemImages[system.id];

          return (
            <button
              key={system.id}
              onClick={() => onToggle(system.id)}
              onMouseEnter={() => hasImage && setHoveredSystem(system.id)}
              onMouseLeave={() => setHoveredSystem(null)}
              className={cn(
                "relative p-2 rounded-md border text-xs font-medium transition-all duration-150",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20"
                  : "bg-card text-card-foreground border-border hover:bg-accent hover:border-accent-foreground/20",
                !hasImage && "opacity-60"
              )}
            >
              {isSelected && (
                <Check className="absolute top-1 right-1 w-3 h-3" />
              )}
              <span className="block truncate">{system.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BodySystemsOverlay;
