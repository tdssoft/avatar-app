import { Checkbox } from "@/components/ui/checkbox";

interface PackageCardProps {
  id: string;
  name: string;
  price: string;
  subtitle?: string;
  description?: string[];
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const PackageCard = ({
  id,
  name,
  price,
  subtitle,
  description,
  isSelected,
  onToggle,
}: PackageCardProps) => {
  return (
    <div
      onClick={() => onToggle(id)}
      className="flex items-start gap-3 py-3 cursor-pointer group"
    >
      <Checkbox
        id={id}
        checked={isSelected}
        onCheckedChange={() => onToggle(id)}
        className="h-5 w-5 mt-0.5 rounded border-2 border-foreground/40 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground"
      />
      <div className="flex-1">
        <label
          htmlFor={id}
          className="cursor-pointer text-foreground font-normal text-base tracking-wide"
        >
          {name} - {price}
        </label>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        )}
        {description && description.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {description.map((item, index) => (
              <li key={index} className="text-muted-foreground text-sm">
                - {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PackageCard;
