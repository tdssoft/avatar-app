import { Checkbox } from "@/components/ui/checkbox";

interface PackageCardProps {
  id: string;
  name: string;
  price: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const PackageCard = ({
  id,
  name,
  price,
  isSelected,
  onToggle,
}: PackageCardProps) => {
  return (
    <div
      onClick={() => onToggle(id)}
      className="flex items-center gap-3 py-3 cursor-pointer group"
    >
      <Checkbox
        id={id}
        checked={isSelected}
        onCheckedChange={() => onToggle(id)}
        className="h-5 w-5 rounded border-2 border-foreground/40 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground"
      />
      <label
        htmlFor={id}
        className="cursor-pointer text-foreground font-normal text-base tracking-wide"
      >
        {name} - {price}
      </label>
    </div>
  );
};

export default PackageCard;
