import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PackageCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const PackageCard = ({
  id,
  name,
  description,
  price,
  isSelected,
  onToggle,
}: PackageCardProps) => {
  return (
    <div
      onClick={() => onToggle(id)}
      className={cn(
        "flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-all duration-300",
        "bg-card/60 backdrop-blur-sm border border-border/50",
        "hover:bg-card/80 hover:border-primary/30",
        isSelected && "border-primary/60 bg-card/80"
      )}
    >
      <Checkbox
        id={id}
        checked={isSelected}
        onCheckedChange={() => onToggle(id)}
        className="mt-1 h-5 w-5 rounded border-2 border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-foreground mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className="text-xl font-bold text-primary whitespace-nowrap">
        {price} zł
      </div>
    </div>
  );
};

export default PackageCard;
