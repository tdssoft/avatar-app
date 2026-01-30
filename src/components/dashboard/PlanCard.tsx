import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PlanCardProps {
  title: string;
  description: string;
  price: string;
  priceUnit?: string;
  onSelect?: () => void;
}

const PlanCard = ({ title, description, price, priceUnit, onSelect }: PlanCardProps) => {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between gap-6">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm text-muted-foreground">od </span>
            <span className="font-bold text-foreground">{price}</span>
            {priceUnit && <span className="text-sm text-muted-foreground"> / {priceUnit}</span>}
          </div>
          <Button
            onClick={onSelect}
            variant="secondary"
            className="bg-muted text-foreground hover:bg-muted/80 px-6 font-semibold"
          >
            Kupuję
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;
