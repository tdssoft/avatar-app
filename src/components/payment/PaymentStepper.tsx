import { cn } from "@/lib/utils";

interface PaymentStepperProps {
  step: 1 | 2 | 3;
}

const steps = [
  "1. Szczegóły pakietu",
  "2. Metoda płatności",
  "3. Płatność",
] as const;

const PaymentStepper = ({ step }: PaymentStepperProps) => {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={cn("h-2 flex-1 rounded-full", s <= step ? "bg-black" : "bg-muted")} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {steps.map((label, idx) => {
          const active = idx + 1 === step;
          return (
            <span key={label} className={cn(active && "text-foreground font-medium")}>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentStepper;

