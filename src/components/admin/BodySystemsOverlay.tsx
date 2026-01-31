import { cn } from "@/lib/utils";

// Import body system images
import baseSilhouette from "@/assets/body-systems/base-silhouette.png";
import limfatycznyImg from "@/assets/body-systems/limfatyczny.png";
import nerwowyImg from "@/assets/body-systems/nerwowy.png";
import miesniowyImg from "@/assets/body-systems/miesniowy.png";
import oddechowyImg from "@/assets/body-systems/oddechowy.png";
import krazeniowyImg from "@/assets/body-systems/krazeniowy.png";
import moczowyImg from "@/assets/body-systems/moczowy.png";
import hormonalnyImg from "@/assets/body-systems/hormonalny.png";
import odpornosciowyImg from "@/assets/body-systems/odpornosciowy.png";

const bodySystemsOptions = [
  { id: "limfatyczny", label: "Układ limfatyczny" },
  { id: "szkieletowy", label: "Układ szkieletowy" },
  { id: "nerwowy", label: "Układ nerwowy" },
  { id: "miesniowy", label: "Układ mięśniowy" },
  { id: "oddechowy", label: "Układ oddechowy" },
  { id: "pokarmowy", label: "Układ pokarmowy" },
  { id: "krazeniowy", label: "Układ krążeniowy" },
  { id: "moczowy", label: "Układ moczowy" },
  { id: "hormonalny", label: "Układ hormonalny" },
  { id: "odpornosciowy", label: "Układ odpornościowy" },
  { id: "rozrodczy", label: "Układ rozrodczy" },
  { id: "powlokowy", label: "Układ powłokowy" },
];

// Map system IDs to their overlay images
const systemImages: Record<string, string> = {
  limfatyczny: limfatycznyImg,
  nerwowy: nerwowyImg,
  miesniowy: miesniowyImg,
  oddechowy: oddechowyImg,
  krazeniowy: krazeniowyImg,
  moczowy: moczowyImg,
  hormonalny: hormonalnyImg,
  odpornosciowy: odpornosciowyImg,
  // Missing images - will show button only without overlay
  // szkieletowy, pokarmowy, rozrodczy, powlokowy
};

interface BodySystemsOverlayProps {
  selectedSystems: string[];
  onToggle: (systemId: string) => void;
}

const BodySystemsOverlay = ({ selectedSystems, onToggle }: BodySystemsOverlayProps) => {
  return (
    <div className="space-y-4">
      {/* Interactive Silhouette with Overlays */}
      <div className="relative w-full aspect-[3/4] bg-muted/30 rounded-lg overflow-hidden">
        {/* Base Silhouette */}
        <img
          src={baseSilhouette}
          alt="Bazowa sylwetka"
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Overlay layers for selected systems */}
        {selectedSystems.map((systemId) =>
          systemImages[systemId] ? (
            <img
              key={systemId}
              src={systemImages[systemId]}
              alt={`Układ ${systemId}`}
              className="absolute inset-0 w-full h-full object-contain opacity-85 transition-opacity duration-300 animate-in fade-in"
            />
          ) : null
        )}

        {/* Selected count badge */}
        {selectedSystems.length > 0 && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
            {selectedSystems.length} wybrano
          </div>
        )}
      </div>

      {/* Body System Buttons Grid */}
      <div className="grid grid-cols-2 gap-2">
        {bodySystemsOptions.map((system) => {
          const isSelected = selectedSystems.includes(system.id);
          const hasImage = !!systemImages[system.id];

          return (
            <button
              key={system.id}
              onClick={() => onToggle(system.id)}
              className={cn(
                "p-3 rounded-lg border text-sm font-medium transition-all duration-200 text-left",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground",
                !hasImage && "opacity-70"
              )}
            >
              <span className="flex items-center gap-2">
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
                {system.label}
              </span>
              {!hasImage && (
                <span className="text-xs opacity-60 block mt-1">
                  (brak obrazu)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BodySystemsOverlay;
