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
    <Card className="border-[#d9dee4] shadow-none">
      <CardContent className="p-4 flex items-center justify-between gap-5">
        <div className="flex-1">
          <h3 className="text-[18px] leading-tight font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-[14px] leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[14px] text-muted-foreground">od </span>
            <span className="text-[16px] leading-none font-bold text-foreground">{price}</span>
            {priceUnit && <span className="text-[14px] text-muted-foreground"> / {priceUnit}</span>}
          </div>
          <Button
            onClick={onSelect}
            variant="secondary"
            className="h-12 bg-muted text-foreground hover:bg-muted/80 px-8 text-[16px] leading-none font-semibold"
          >
            Kupuję
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;
