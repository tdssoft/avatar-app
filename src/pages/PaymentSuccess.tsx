import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import avatarLogo from "@/assets/avatar-logo.svg";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <img
            src={avatarLogo}
            alt="Avatar centrum zdrowia"
            className="h-12 mx-auto mb-6"
          />

          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-accent" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Płatność zakończona pomyślnie!
          </h1>
          <p className="text-muted-foreground mb-6">
            Dziękujemy za zakup. Twoje zamówienie zostało przyjęte do realizacji.
            Wkrótce otrzymasz potwierdzenie na adres email.
          </p>

          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Przejdź do panelu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
